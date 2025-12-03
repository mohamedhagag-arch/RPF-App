'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Settings, Save, RefreshCw, QrCode, Palette, 
  Maximize2, Image, Type, Square, Eye, 
  CheckCircle, AlertCircle, Download, Star, Shapes, Layout, Upload, Trash2, Layers
} from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'
import { QRSettings as QRSettingsType, defaultQRSettings } from '@/hooks/useQRSettings'
import { QRRenderer } from './QRRenderer'

export function QRSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<QRSettingsType>(defaultQRSettings)
  const [previewQRCode] = useState('EMP-12345678') // Sample QR code for preview
  const [activeTab, setActiveTab] = useState<'templates' | 'shape' | 'color' | 'logo' | 'frame'>('templates')
  const [expandEyes, setExpandEyes] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from(TABLES.ATTENDANCE_SETTINGS)
        .select('*')
        .like('key', 'qr_%')

      if (fetchError) throw fetchError

      const loadedSettings = { ...defaultQRSettings }
      
      if (data) {
        data.forEach((item: any) => {
          const key = item.key.replace('qr_', '') as keyof QRSettingsType
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
    } catch (err: any) {
      setError('Failed to load settings: ' + err.message)
      console.error('Error loading QR settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key: `qr_${key}`,
        value: String(value),
        description: `QR Code setting: ${key}`
      }))

      // Use upsert to save all settings
      for (const setting of settingsToSave) {
        const { error: upsertError } = await supabase
          .from(TABLES.ATTENDANCE_SETTINGS)
          // @ts-ignore
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description
          }, {
            onConflict: 'key'
          })

        if (upsertError) throw upsertError
      }

      setSuccess('QR Code settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save settings: ' + err.message)
      console.error('Error saving QR settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all QR Code settings to defaults?')) {
      setSettings(defaultQRSettings)
    }
  }

  const updateSetting = <K extends keyof QRSettingsType>(key: K, value: QRSettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateSetting('logoUrl', ev.target?.result as string)
        updateSetting('logoEnabled', true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateSetting('bgImage', ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const applyTemplate = (name: string) => {
    switch (name) {
      case 'modern':
        updateSetting('dotStyle', 'rounded')
        updateSetting('eyeFrame', 'circle')
        updateSetting('eyeStyle', 'circle')
        updateSetting('useGradient', true)
        updateSetting('gradientStart', '#6366f1')
        updateSetting('gradientEnd', '#a855f7')
        updateSetting('backgroundColor', '#ffffff')
        updateSetting('bgImage', null)
        updateSetting('frame', 'none')
        break
      case 'classic':
        updateSetting('dotStyle', 'square')
        updateSetting('eyeFrame', 'square')
        updateSetting('eyeStyle', 'square')
        updateSetting('useGradient', false)
        updateSetting('foregroundColor', '#000000')
        updateSetting('backgroundColor', '#ffffff')
        updateSetting('bgImage', null)
        updateSetting('frame', 'none')
        break
      case 'soft':
        updateSetting('dotStyle', 'dots')
        updateSetting('eyeFrame', 'rounded')
        updateSetting('eyeStyle', 'circle')
        updateSetting('useGradient', true)
        updateSetting('gradientStart', '#3b82f6')
        updateSetting('gradientEnd', '#06b6d4')
        updateSetting('backgroundColor', '#ffffff')
        updateSetting('bgImage', null)
        updateSetting('frame', 'border')
        updateSetting('frameColor', '#0ea5e9')
        break
      case 'elegant':
        updateSetting('dotStyle', 'classy')
        updateSetting('eyeFrame', 'rounded')
        updateSetting('eyeStyle', 'square')
        updateSetting('useGradient', false)
        updateSetting('foregroundColor', '#1e293b')
        updateSetting('eyeColor', '#d97706')
        updateSetting('backgroundColor', '#f8fafc')
        updateSetting('bgImage', null)
        updateSetting('frame', 'badge')
        updateSetting('frameColor', '#1e293b')
        updateSetting('frameText', 'EXCLUSIVE')
        break
      case 'rabat':
        // Rabat Foundation Design: Orange eyes, Purple data, Logo in center
        updateSetting('dotStyle', 'rounded')
        updateSetting('eyeFrame', 'square')
        updateSetting('eyeStyle', 'square')
        updateSetting('useGradient', false)
        updateSetting('foregroundColor', '#9333EA') // Purple for data (vibrant purple)
        updateSetting('eyeColor', '#F97316') // Orange for eyes (vibrant orange)
        updateSetting('eyeColorTL', null) // Use universal eye color
        updateSetting('eyeColorTR', null)
        updateSetting('eyeColorBL', null)
        updateSetting('backgroundColor', '#FFFFFF')
        updateSetting('bgImage', null)
        updateSetting('frame', 'none')
        updateSetting('logoEnabled', true)
        updateSetting('logoSize', 25) // Default logo size
        updateSetting('logoOpacity', 1)
        // Note: User needs to upload logo manually
        break
    }
  }

  // Helper to calculate gradient direction coordinates
  const getGradientCoords = (angle: string) => {
    switch (angle) {
      case '0': return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }
      case '45': return { x1: '0%', y1: '100%', x2: '100%', y2: '0%' }
      case '90': return { x1: '0%', y1: '100%', x2: '0%', y2: '0%' }
      case '135': return { x1: '0%', y1: '0%', x2: '100%', y2: '100%' }
      default: return { x1: '0%', y1: '0%', x2: '100%', y2: '0%' }
    }
  }

  const gradientCoords = getGradientCoords(settings.gradientDirection)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <QrCode className="h-6 w-6 text-blue-500" />
          QR Code Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize the appearance and style of employee QR codes
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <CheckCircle className="w-4 h-4" />
          {success}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Size & Spacing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Maximize2 className="w-5 h-5" />
                Size & Spacing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  QR Code Size: {settings.size}px
                </label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="10"
                  value={settings.size}
                  onChange={(e) => updateSetting('size', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Margin Size: {settings.marginSize}
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={settings.marginSize}
                  onChange={(e) => updateSetting('marginSize', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Foreground Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.foregroundColor}
                    onChange={(e) => updateSetting('foregroundColor', e.target.value)}
                    className="w-16 h-10 rounded border"
                  />
                  <Input
                    type="text"
                    value={settings.foregroundColor}
                    onChange={(e) => updateSetting('foregroundColor', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Background Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                    className="w-16 h-10 rounded border"
                  />
                  <Input
                    type="text"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Colors - Gradient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Advanced Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <span className="text-sm font-medium text-indigo-900">Gradient Fill</span>
                <input 
                  type="checkbox" 
                  checked={settings.useGradient}
                  onChange={(e) => updateSetting('useGradient', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              
              {settings.useGradient ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Color</label>
                      <input 
                        type="color" 
                        value={settings.gradientStart} 
                        onChange={(e) => updateSetting('gradientStart', e.target.value)} 
                        className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Color</label>
                      <input 
                        type="color" 
                        value={settings.gradientEnd} 
                        onChange={(e) => updateSetting('gradientEnd', e.target.value)} 
                        className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Direction</label>
                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                      {['0', '45', '90', '135'].map((deg) => (
                        <button
                          key={deg}
                          onClick={() => updateSetting('gradientDirection', deg as '0' | '45' | '90' | '135')}
                          className={`flex-1 text-xs py-2 rounded-md font-medium transition-colors ${
                            settings.gradientDirection === deg 
                              ? 'bg-white shadow-sm text-indigo-600' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {/* Background Image */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium mb-2">Background Texture</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="flex-1 flex items-center justify-center p-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 text-xs text-slate-500">
                    <Upload className="w-3 h-3 mr-1" /> Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                  </label>
                  {settings.bgImage && (
                    <button 
                      onClick={() => updateSetting('bgImage', null)} 
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {settings.bgImage && (
                  <div>
                    <label className="text-xs text-slate-400">Opacity: {Math.round(settings.bgOpacity * 100)}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={settings.bgOpacity} 
                      onChange={(e) => updateSetting('bgOpacity', parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shapes & Styles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shapes className="w-5 h-5" />
                Shapes & Styles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data Pattern</label>
                <div className="grid grid-cols-3 gap-2">
                  {['square', 'dots', 'rounded', 'extra-rounded', 'classy', 'diamond', 'star', 'cross', 'heart'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateSetting('dotStyle', style as any)}
                      className={`p-2 border rounded-lg text-xs capitalize transition-all ${
                        settings.dotStyle === style 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' 
                          : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                      }`}
                    >
                      {style.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-medium mb-2">Marker Borders (Eyes)</label>
                <div className="grid grid-cols-3 gap-2">
                  {['square', 'rounded', 'circle', 'leaf'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateSetting('eyeFrame', style as any)}
                      className={`p-2 border rounded-lg text-xs capitalize transition-all ${
                        settings.eyeFrame === style 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' 
                          : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Marker Center</label>
                <div className="grid grid-cols-2 gap-2">
                  {['square', 'circle'].map((style) => (
                    <button
                      key={style}
                      onClick={() => updateSetting('eyeStyle', style as any)}
                      className={`p-2 border rounded-lg text-xs capitalize transition-all ${
                        settings.eyeStyle === style 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600' 
                          : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Eye Colors */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpandEyes(!expandEyes)}>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <label className="block text-sm font-medium cursor-pointer">Eye Colors</label>
                  </div>
                  <span className="text-xs text-indigo-600">{expandEyes ? 'Collapse' : 'Expand'}</span>
                </div>
                
                {expandEyes ? (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="text-xs text-slate-500">Universal</label>
                        <div className={`relative h-10 rounded-lg border ${settings.eyeColor ? 'border-slate-300' : 'border-dashed border-slate-300 bg-white flex items-center justify-center text-xs text-slate-400'}`}>
                          {settings.eyeColor ? (
                            <>
                              <input 
                                type="color" 
                                value={settings.eyeColor} 
                                onChange={(e) => updateSetting('eyeColor', e.target.value)} 
                                className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" 
                              />
                              <div className="absolute inset-1 rounded bg-current pointer-events-none" style={{ backgroundColor: settings.eyeColor }} />
                            </>
                          ) : (
                            <span onClick={() => updateSetting('eyeColor', '#000000')} className="cursor-pointer w-full h-full flex items-center justify-center">Same as Data</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-slate-200 col-span-2 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                        <Layers className="w-3 h-3" /> Individual Corners
                      </div>

                      <div>
                        <label className="text-xs text-slate-500">Top Left</label>
                        <input 
                          type="color" 
                          value={settings.eyeColorTL || settings.eyeColor || '#000000'} 
                          onChange={(e) => updateSetting('eyeColorTL', e.target.value)} 
                          className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Top Right</label>
                        <input 
                          type="color" 
                          value={settings.eyeColorTR || settings.eyeColor || '#000000'} 
                          onChange={(e) => updateSetting('eyeColorTR', e.target.value)} 
                          className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Bottom Left</label>
                        <input 
                          type="color" 
                          value={settings.eyeColorBL || settings.eyeColor || '#000000'} 
                          onChange={(e) => updateSetting('eyeColorBL', e.target.value)} 
                          className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                        />
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={() => updateSetting('eyeColorTL', null)} 
                          className="text-xs text-red-500 hover:underline mb-1"
                        >
                          Reset Individual
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`relative flex-1 h-10 rounded-lg border ${settings.eyeColor ? 'border-slate-300' : 'border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400'}`}>
                      {settings.eyeColor ? (
                        <>
                          <input 
                            type="color" 
                            value={settings.eyeColor} 
                            onChange={(e) => updateSetting('eyeColor', e.target.value)} 
                            className="w-full h-full opacity-0 cursor-pointer absolute top-0 left-0" 
                          />
                          <div className="absolute inset-1 rounded bg-current pointer-events-none" style={{ backgroundColor: settings.eyeColor }} />
                        </>
                      ) : (
                        <span onClick={() => updateSetting('eyeColor', '#000000')} className="cursor-pointer w-full h-full flex items-center justify-center">Same as Data</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Frames */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Frames
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'none', label: 'No Frame' },
                  { id: 'border', label: 'Simple Border' },
                  { id: 'badge', label: 'Badge Text' },
                  { id: 'phone', label: 'Phone Mockup' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => updateSetting('frame', f.id as any)}
                    className={`p-3 border rounded-lg text-sm font-medium transition-all ${
                      settings.frame === f.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {settings.frame === 'badge' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Frame Text</label>
                    <Input 
                      type="text" 
                      value={settings.frameText} 
                      onChange={(e) => updateSetting('frameText', e.target.value)} 
                      placeholder="SCAN ME"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Badge Color</label>
                    <input 
                      type="color" 
                      value={settings.frameColor} 
                      onChange={(e) => updateSetting('frameColor', e.target.value)} 
                      className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                    />
                  </div>
                </>
              )}
              
              {settings.frame === 'border' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Border Color</label>
                  <input 
                    type="color" 
                    value={settings.frameColor} 
                    onChange={(e) => updateSetting('frameColor', e.target.value)} 
                    className="w-full h-10 rounded cursor-pointer border border-slate-200" 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Quick Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'classic', label: 'Classic', color: 'bg-black' },
                  { id: 'modern', label: 'Modern', color: 'bg-gradient-to-r from-indigo-500 to-purple-500' },
                  { id: 'soft', label: 'Soft Blue', color: 'bg-gradient-to-r from-blue-400 to-cyan-400' },
                  { id: 'elegant', label: 'Elegant', color: 'bg-slate-800 border-b-4 border-amber-500' },
                  { id: 'rabat', label: 'Rabat Style', color: 'bg-gradient-to-r from-orange-500 to-purple-500' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-4 text-left h-24 flex flex-col justify-between"
                  >
                    <div className={`w-8 h-8 rounded-full ${t.color} mb-2`}></div>
                    <span className="font-semibold text-slate-700 group-hover:text-indigo-700">{t.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error Correction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Error Correction Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={settings.errorCorrectionLevel}
                onChange={(e) => updateSetting('errorCorrectionLevel', e.target.value as 'L' | 'M' | 'Q' | 'H')}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="L">L - Low (~7% recovery)</option>
                <option value="M">M - Medium (~15% recovery)</option>
                <option value="Q">Q - Quartile (~25% recovery)</option>
                <option value="H">H - High (~30% recovery)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Higher levels allow more damage/obstruction but increase QR code complexity
              </p>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Logo Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold">Click to upload</span> logo
                  </p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>

              {settings.logoUrl && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-600">Show Logo</div>
                    <input 
                      type="checkbox" 
                      checked={settings.logoEnabled} 
                      onChange={(e) => updateSetting('logoEnabled', e.target.checked)} 
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  {settings.logoEnabled && (
                    <>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Size</span>
                          <span>{Math.round(settings.logoSize)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="40" 
                          value={settings.logoSize} 
                          onChange={(e) => updateSetting('logoSize', Number(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Opacity</span>
                          <span>{Math.round(settings.logoOpacity * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          value={settings.logoOpacity} 
                          onChange={(e) => updateSetting('logoOpacity', parseFloat(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                        />
                      </div>
                      {settings.logoUrl && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              updateSetting('logoUrl', '')
                              updateSetting('logoEnabled', false)
                            }} 
                            className="flex-1 p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Remove Logo
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Text Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="textEnabled"
                  checked={settings.textEnabled}
                  onChange={(e) => updateSetting('textEnabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="textEnabled" className="text-sm font-medium">
                  Show Text
                </label>
              </div>
              {settings.textEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Text Content</label>
                    <Input
                      type="text"
                      value={settings.textContent}
                      onChange={(e) => updateSetting('textContent', e.target.value)}
                      placeholder="Employee QR Code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Text Position</label>
                    <select
                      value={settings.textPosition}
                      onChange={(e) => updateSetting('textPosition', e.target.value as 'top' | 'bottom')}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Text Size: {settings.textSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="24"
                      step="1"
                      value={settings.textSize}
                      onChange={(e) => updateSetting('textSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.textColor}
                        onChange={(e) => updateSetting('textColor', e.target.value)}
                        className="w-16 h-10 rounded border"
                      />
                      <Input
                        type="text"
                        value={settings.textColor}
                        onChange={(e) => updateSetting('textColor', e.target.value)}
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Border Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="w-5 h-5" />
                Border Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="borderEnabled"
                  checked={settings.borderEnabled}
                  onChange={(e) => updateSetting('borderEnabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="borderEnabled" className="text-sm font-medium">
                  Enable Border
                </label>
              </div>
              {settings.borderEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Width: {settings.borderWidth}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={settings.borderWidth}
                      onChange={(e) => updateSetting('borderWidth', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Border Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={settings.borderColor}
                        onChange={(e) => updateSetting('borderColor', e.target.value)}
                        className="w-16 h-10 rounded border"
                      />
                      <Input
                        type="text"
                        value={settings.borderColor}
                        onChange={(e) => updateSetting('borderColor', e.target.value)}
                        placeholder="#E5E7EB"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Border Radius: {settings.borderRadius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={settings.borderRadius}
                      onChange={(e) => updateSetting('borderRadius', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Defaults
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
                {settings.textEnabled && settings.textPosition === 'top' && (
                  <p 
                    className="mb-4 font-semibold"
                    style={{ 
                      fontSize: `${settings.textSize}px`,
                      color: settings.textColor
                    }}
                  >
                    {settings.textContent}
                  </p>
                )}
                
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: `${settings.marginSize * 4}px`,
                    backgroundColor: settings.backgroundColor,
                    border: settings.borderEnabled 
                      ? `${settings.borderWidth}px solid ${settings.borderColor}`
                      : 'none',
                    borderRadius: `${settings.borderRadius}px`
                  }}
                >
                  {/* Hidden SVG for Gradient Definitions */}
                  <svg width="0" height="0" className="absolute opacity-0 pointer-events-none">
                    <defs id="qr-gradient-defs">
                      <linearGradient 
                        id="qr-gradient" 
                        x1={gradientCoords.x1} 
                        y1={gradientCoords.y1} 
                        x2={gradientCoords.x2} 
                        y2={gradientCoords.y2} 
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={settings.gradientStart} />
                        <stop offset="100%" stopColor={settings.gradientEnd} />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ width: settings.size, height: settings.size }}>
                    <QRRenderer 
                      qrCode={previewQRCode} 
                      settings={settings}
                      gradientId={settings.useGradient ? 'qr-gradient' : undefined}
                    />
                  </div>
                </div>

                {settings.textEnabled && settings.textPosition === 'bottom' && (
                  <p 
                    className="mt-4 font-semibold"
                    style={{ 
                      fontSize: `${settings.textSize}px`,
                      color: settings.textColor
                    }}
                  >
                    {settings.textContent}
                  </p>
                )}

                <div className="mt-4 text-xs text-gray-500 text-center">
                  <p>Sample QR Code: {previewQRCode}</p>
                  <p className="mt-1">Changes apply to all employee QR codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


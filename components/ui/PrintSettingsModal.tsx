'use client'

import { useState, useEffect } from 'react'
import { X, Printer, Settings, FileText, Layout, Type, Maximize2, PenTool, Plus, Trash2, User, BarChart3 } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'

export interface SignatureField {
  id: string
  name: string
  title: string
  position?: string
}

export interface PrintSettings {
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal'
  margins?: 'small' | 'medium' | 'large' | 'custom'
  customMargins?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  fontSize?: 'small' | 'medium' | 'large' | 'custom'
  customFontSize?: string
  compactMode?: boolean
  showPageNumbers?: boolean
  showDate?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showSignatures?: boolean
  signatures?: SignatureField[]
  signatureLayout?: 'horizontal' | 'vertical'
  customHeaderText?: string
  customFooterText?: string
  companyName?: string
  pageBreak?: 'auto' | 'avoid' | 'always'
  includeImages?: boolean
  includeCharts?: boolean
  chartSize?: 'small' | 'medium' | 'large' | 'full-width'
  chartQuality?: 'normal' | 'high'
  chartBackground?: 'white' | 'transparent'
  chartShowLegend?: boolean
  chartShowGrid?: boolean
  colorMode?: 'color' | 'grayscale' | 'black-white'
  quality?: 'draft' | 'normal' | 'high'
}

interface PrintSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (settings: PrintSettings) => void
  defaultSettings?: PrintSettings
}

export function PrintSettingsModal({
  isOpen,
  onClose,
  onApply,
  defaultSettings = {}
}: PrintSettingsModalProps) {
  const [settings, setSettings] = useState<PrintSettings>({
    orientation: 'landscape',
    pageSize: 'A4',
    margins: 'medium',
    fontSize: 'medium',
    compactMode: true,
    showPageNumbers: true,
    showDate: true,
    showHeader: true,
    showFooter: true,
    showSignatures: false,
    pageBreak: 'auto',
    includeImages: false,
    includeCharts: false,
    chartSize: 'medium',
    chartQuality: 'normal',
    chartBackground: 'white',
    chartShowLegend: true,
    chartShowGrid: true,
    colorMode: 'color',
    quality: 'normal',
    ...defaultSettings
  })

  const [showCustomMargins, setShowCustomMargins] = useState(false)
  const [showCustomFontSize, setShowCustomFontSize] = useState(false)

  // Initialize signatures if not present
  useEffect(() => {
    if (isOpen && (!settings.signatures || settings.signatures.length === 0)) {
      setSettings(prev => ({
        ...prev,
        signatures: [
          { id: '1', name: '', title: 'Prepared By', position: '' },
          { id: '2', name: '', title: 'Approved By', position: '' }
        ],
        signatureLayout: prev.signatureLayout || 'horizontal'
      }))
    }
  }, [isOpen])

  if (!isOpen) return null

  const addSignature = () => {
    const newId = Date.now().toString()
    setSettings({
      ...settings,
      signatures: [
        ...(settings.signatures || []),
        { id: newId, name: '', title: 'Signature', position: '' }
      ]
    })
  }

  const removeSignature = (id: string) => {
    setSettings({
      ...settings,
      signatures: (settings.signatures || []).filter(sig => sig.id !== id)
    })
  }

  const updateSignature = (id: string, field: keyof SignatureField, value: string) => {
    setSettings({
      ...settings,
      signatures: (settings.signatures || []).map(sig =>
        sig.id === id ? { ...sig, [field]: value } : sig
      )
    })
  }

  const handleApply = () => {
    onApply(settings)
    onClose()
  }

  const handleReset = () => {
    setSettings({
      orientation: 'landscape',
      pageSize: 'A4',
      margins: 'medium',
      fontSize: 'medium',
      compactMode: true,
      showPageNumbers: true,
      showDate: true,
      showHeader: true,
      showFooter: true,
      showSignatures: false,
      signatures: [
        { id: '1', name: '', title: 'Prepared By', position: '' },
        { id: '2', name: '', title: 'Approved By', position: '' }
      ],
      signatureLayout: 'horizontal',
      customHeaderText: '',
      customFooterText: '',
      companyName: '',
      pageBreak: 'auto',
      includeImages: false,
      includeCharts: false,
      chartSize: 'medium',
      chartQuality: 'normal',
      chartBackground: 'white',
      chartShowLegend: true,
      chartShowGrid: true,
      colorMode: 'color',
      quality: 'normal'
    })
    setShowCustomMargins(false)
    setShowCustomFontSize(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Print Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Page Layout */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Page Layout
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orientation
                </label>
                <select
                  value={settings.orientation || 'landscape'}
                  onChange={(e) => setSettings({ ...settings, orientation: e.target.value as 'portrait' | 'landscape' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              {/* Page Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Page Size
                </label>
                <select
                  value={settings.pageSize || 'A4'}
                  onChange={(e) => setSettings({ ...settings, pageSize: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
            </div>

            {/* Margins */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Margins
              </label>
              <div className="space-y-2">
                <select
                  value={settings.margins || 'medium'}
                  onChange={(e) => {
                    const value = e.target.value
                    setSettings({ ...settings, margins: value as any })
                    setShowCustomMargins(value === 'custom')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="small">Small (0.5cm)</option>
                  <option value="medium">Medium (1.5cm)</option>
                  <option value="large">Large (2.5cm)</option>
                  <option value="custom">Custom</option>
                </select>
                
                {showCustomMargins && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Top</label>
                      <Input
                        type="text"
                        placeholder="1cm"
                        value={settings.customMargins?.top || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          customMargins: { ...settings.customMargins, top: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Right</label>
                      <Input
                        type="text"
                        placeholder="1cm"
                        value={settings.customMargins?.right || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          customMargins: { ...settings.customMargins, right: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bottom</label>
                      <Input
                        type="text"
                        placeholder="1cm"
                        value={settings.customMargins?.bottom || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          customMargins: { ...settings.customMargins, bottom: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Left</label>
                      <Input
                        type="text"
                        placeholder="1cm"
                        value={settings.customMargins?.left || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          customMargins: { ...settings.customMargins, left: e.target.value }
                        })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Size
                </label>
                <select
                  value={settings.fontSize || 'medium'}
                  onChange={(e) => {
                    const value = e.target.value
                    setSettings({ ...settings, fontSize: value as any })
                    setShowCustomFontSize(value === 'custom')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="small">Small (8pt)</option>
                  <option value="medium">Medium (10pt)</option>
                  <option value="large">Large (12pt)</option>
                  <option value="custom">Custom</option>
                </select>
                
                {showCustomFontSize && (
                  <Input
                    type="text"
                    placeholder="10pt"
                    value={settings.customFontSize || ''}
                    onChange={(e) => setSettings({ ...settings, customFontSize: e.target.value })}
                    className="mt-2 text-sm"
                  />
                )}
              </div>

              {/* Color Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Mode
                </label>
                <select
                  value={settings.colorMode || 'color'}
                  onChange={(e) => setSettings({ ...settings, colorMode: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="color">Color</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="black-white">Black & White</option>
                </select>
              </div>
            </div>

            {/* Compact Mode */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="compactMode"
                checked={settings.compactMode ?? true}
                onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="compactMode" className="text-sm text-gray-700 dark:text-gray-300">
                Compact Mode (Reduce spacing for more content)
              </label>
            </div>
          </div>

          {/* Content Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Options
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showHeader"
                  checked={settings.showHeader ?? true}
                  onChange={(e) => setSettings({ ...settings, showHeader: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showHeader" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Header
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showFooter"
                  checked={settings.showFooter ?? true}
                  onChange={(e) => setSettings({ ...settings, showFooter: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showFooter" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Footer
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPageNumbers"
                  checked={settings.showPageNumbers ?? true}
                  onChange={(e) => setSettings({ ...settings, showPageNumbers: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showPageNumbers" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Page Numbers
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showDate"
                  checked={settings.showDate ?? true}
                  onChange={(e) => setSettings({ ...settings, showDate: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showDate" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Date & Time
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSignatures"
                  checked={settings.showSignatures ?? false}
                  onChange={(e) => setSettings({ ...settings, showSignatures: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="showSignatures" className="text-sm text-gray-700 dark:text-gray-300">
                  Show Signatures Section
                </label>
              </div>

              {/* Custom Header Text */}
              {settings.showHeader && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Custom Header Text (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter custom header text..."
                    value={settings.customHeaderText || ''}
                    onChange={(e) => setSettings({ ...settings, customHeaderText: e.target.value })}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Custom Footer Text */}
              {settings.showFooter && (
                <div className="mt-2">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Custom Footer Text (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter custom footer text..."
                    value={settings.customFooterText || ''}
                    onChange={(e) => setSettings({ ...settings, customFooterText: e.target.value })}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Company Name */}
              <div className="mt-2">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Company Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Enter company name..."
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={settings.includeImages ?? false}
                  onChange={(e) => setSettings({ ...settings, includeImages: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeImages" className="text-sm text-gray-700 dark:text-gray-300">
                  Include Images
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={settings.includeCharts ?? false}
                  onChange={(e) => setSettings({ ...settings, includeCharts: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeCharts" className="text-sm text-gray-700 dark:text-gray-300">
                  Include Charts & Graphs
                </label>
              </div>
            </div>
          </div>

          {/* Charts Configuration */}
          {settings.includeCharts && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Charts Settings
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Chart Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Size
                  </label>
                  <select
                    value={settings.chartSize || 'medium'}
                    onChange={(e) => setSettings({ ...settings, chartSize: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="full-width">Full Width</option>
                  </select>
                </div>

                {/* Chart Quality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Quality
                  </label>
                  <select
                    value={settings.chartQuality || 'normal'}
                    onChange={(e) => setSettings({ ...settings, chartQuality: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Chart Background */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chart Background
                  </label>
                  <select
                    value={settings.chartBackground || 'white'}
                    onChange={(e) => setSettings({ ...settings, chartBackground: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="white">White</option>
                    <option value="transparent">Transparent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chartShowLegend"
                    checked={settings.chartShowLegend ?? true}
                    onChange={(e) => setSettings({ ...settings, chartShowLegend: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="chartShowLegend" className="text-sm text-gray-700 dark:text-gray-300">
                    Show Chart Legend
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chartShowGrid"
                    checked={settings.chartShowGrid ?? true}
                    onChange={(e) => setSettings({ ...settings, chartShowGrid: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="chartShowGrid" className="text-sm text-gray-700 dark:text-gray-300">
                    Show Chart Grid
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Signatures Section */}
          {settings.showSignatures && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Signatures Configuration
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSignature}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Signature
                </Button>
              </div>

              {/* Signature Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Signature Layout
                </label>
                <select
                  value={settings.signatureLayout || 'horizontal'}
                  onChange={(e) => setSettings({ ...settings, signatureLayout: e.target.value as 'horizontal' | 'vertical' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="horizontal">Horizontal (Side by Side)</option>
                  <option value="vertical">Vertical (Stacked)</option>
                </select>
              </div>

              {/* Signature Fields */}
              <div className="space-y-3">
                {(settings.signatures || []).map((signature, index) => (
                  <div key={signature.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Signature {index + 1}
                        </span>
                      </div>
                      {(settings.signatures || []).length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSignature(signature.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Name
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter name..."
                          value={signature.name}
                          onChange={(e) => updateSignature(signature.id, 'name', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Title / Role
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., Project Manager, Director..."
                          value={signature.title}
                          onChange={(e) => updateSignature(signature.id, 'title', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Position / Department (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., Engineering Department..."
                          value={signature.position || ''}
                          onChange={(e) => updateSignature(signature.id, 'position', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Maximize2 className="h-4 w-4" />
              Advanced Options
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Page Break */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Page Break Behavior
                </label>
                <select
                  value={settings.pageBreak || 'auto'}
                  onChange={(e) => setSettings({ ...settings, pageBreak: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="auto">Auto</option>
                  <option value="avoid">Avoid Breaks</option>
                  <option value="always">Force Breaks</option>
                </select>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Print Quality
                </label>
                <select
                  value={settings.quality || 'normal'}
                  onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-sm"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
              className="text-sm flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Apply & Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

















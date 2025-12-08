'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { IDCardDesign } from './IDCardGenerator'
import { 
  Save, X, Palette, Type, Layout, Image as ImageIcon, 
  Settings, Eye, EyeOff, Plus, Trash2
} from 'lucide-react'

interface IDCardDesignerProps {
  design: IDCardDesign
  onDesignChange: (design: IDCardDesign) => void
  onSave: () => void
  onCancel: () => void
}

export function IDCardDesigner({ design, onDesignChange, onSave, onCancel }: IDCardDesignerProps) {
  const [activeTab, setActiveTab] = useState<'front' | 'back' | 'general'>('general')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const updateDesign = (updates: Partial<IDCardDesign>) => {
    onDesignChange({ ...design, ...updates })
  }

  const updateFront = (updates: Partial<IDCardDesign['front']>) => {
    onDesignChange({ ...design, front: { ...design.front, ...updates } })
  }

  const updateBack = (updates: Partial<IDCardDesign['back']>) => {
    onDesignChange({ ...design, back: { ...design.back, ...updates } })
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left Sidebar - Design Controls */}
      <div className="w-80 border-r overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={activeTab === 'general' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('general')}
            >
              General
            </Button>
            <Button
              variant={activeTab === 'front' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('front')}
            >
              Front
            </Button>
            <Button
              variant={activeTab === 'back' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('back')}
            >
              Back
            </Button>
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <Section
                title="Card Dimensions"
                expanded={expandedSections.has('dimensions')}
                onToggle={() => toggleSection('dimensions')}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Width (mm)</label>
                  <Input
                    type="number"
                    value={design.width}
                    onChange={(e) => updateDesign({ width: parseFloat(e.target.value) || 85.6 })}
                    step="0.1"
                  />
                  <label className="text-sm font-medium">Height (mm)</label>
                  <Input
                    type="number"
                    value={design.height}
                    onChange={(e) => updateDesign({ height: parseFloat(e.target.value) || 53.98 })}
                    step="0.1"
                  />
                  <label className="text-sm font-medium">Border Radius (mm)</label>
                  <Input
                    type="number"
                    value={design.borderRadius}
                    onChange={(e) => updateDesign({ borderRadius: parseFloat(e.target.value) || 3 })}
                    step="0.1"
                  />
                </div>
              </Section>
            </div>
          )}

          {/* Front Side Settings */}
          {activeTab === 'front' && (
            <div className="space-y-4">
              <Section
                title="Background"
                expanded={expandedSections.has('front-bg')}
                onToggle={() => toggleSection('front-bg')}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Background Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.front.backgroundColor}
                      onChange={(e) => updateFront({ backgroundColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={design.front.backgroundColor}
                      onChange={(e) => updateFront({ backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <label className="text-sm font-medium">Background Image URL (optional)</label>
                  <Input
                    type="url"
                    value={design.front.backgroundImage || ''}
                    onChange={(e) => updateFront({ backgroundImage: e.target.value || undefined })}
                    placeholder="https://..."
                  />
                  <label className="text-sm font-medium">Background Opacity</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={design.front.backgroundOpacity}
                    onChange={(e) => updateFront({ backgroundOpacity: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </Section>

              <Section
                title="Logo"
                expanded={expandedSections.has('front-logo')}
                onToggle={() => toggleSection('front-logo')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.front.logo?.enabled || false}
                      onChange={(e) => updateFront({ logo: { ...design.front.logo, enabled: e.target.checked } as any })}
                    />
                    <span className="text-sm font-medium">Enable Logo</span>
                  </label>
                  {design.front.logo?.enabled && (
                    <>
                      <label className="text-sm font-medium">Logo URL</label>
                      <Input
                        type="url"
                        value={design.front.logo?.url || ''}
                        onChange={(e) => updateFront({ logo: { ...design.front.logo, url: e.target.value } as any })}
                      />
                      <label className="text-sm font-medium">Position</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={design.front.logo?.position || 'top-center'}
                        onChange={(e) => updateFront({ logo: { ...design.front.logo, position: e.target.value as any } as any })}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-center">Top Center</option>
                        <option value="top-right">Top Right</option>
                        <option value="center">Center</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-center">Bottom Center</option>
                        <option value="bottom-right">Bottom Right</option>
                      </select>
                      <label className="text-sm font-medium">Size (%)</label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={design.front.logo?.size || 20}
                        onChange={(e) => updateFront({ logo: { ...design.front.logo, size: parseFloat(e.target.value) || 20 } as any })}
                      />
                      <label className="text-sm font-medium">Opacity</label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={design.front.logo?.opacity || 1}
                        onChange={(e) => updateFront({ logo: { ...design.front.logo, opacity: parseFloat(e.target.value) || 1 } as any })}
                      />
                    </>
                  )}
                </div>
              </Section>

              <Section
                title="Employee Photo"
                expanded={expandedSections.has('front-photo')}
                onToggle={() => toggleSection('front-photo')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.front.photo?.enabled || false}
                      onChange={(e) => updateFront({ photo: { ...design.front.photo, enabled: e.target.checked } as any })}
                    />
                    <span className="text-sm font-medium">Enable Photo</span>
                  </label>
                  {design.front.photo?.enabled && (
                    <>
                      <label className="text-sm font-medium">Position</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={design.front.photo?.position || 'left'}
                        onChange={(e) => updateFront({ photo: { ...design.front.photo, position: e.target.value as any } as any })}
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="center">Center</option>
                      </select>
                      <label className="text-sm font-medium">Size (%)</label>
                      <Input
                        type="number"
                        min="10"
                        max="50"
                        value={design.front.photo?.size || 30}
                        onChange={(e) => updateFront({ photo: { ...design.front.photo, size: parseFloat(e.target.value) || 30 } as any })}
                      />
                      <label className="text-sm font-medium">Shape</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={design.front.photo?.shape || 'rounded'}
                        onChange={(e) => updateFront({ photo: { ...design.front.photo, shape: e.target.value as any } as any })}
                      >
                        <option value="square">Square</option>
                        <option value="circle">Circle</option>
                        <option value="rounded">Rounded</option>
                      </select>
                    </>
                  )}
                </div>
              </Section>

              <Section
                title="Employee Name"
                expanded={expandedSections.has('front-name')}
                onToggle={() => toggleSection('front-name')}
              >
                <TextFieldSettings
                  field={design.front.employeeName}
                  onChange={(field) => updateFront({ employeeName: field })}
                />
              </Section>

              <Section
                title="Employee Code"
                expanded={expandedSections.has('front-code')}
                onToggle={() => toggleSection('front-code')}
              >
                <TextFieldSettings
                  field={design.front.employeeCode}
                  onChange={(field) => updateFront({ employeeCode: field })}
                  showLabel
                />
              </Section>

              <Section
                title="Job Title"
                expanded={expandedSections.has('front-job')}
                onToggle={() => toggleSection('front-job')}
              >
                <TextFieldSettings
                  field={design.front.jobTitle}
                  onChange={(field) => updateFront({ jobTitle: field })}
                />
              </Section>

              <Section
                title="Department"
                expanded={expandedSections.has('front-dept')}
                onToggle={() => toggleSection('front-dept')}
              >
                <TextFieldSettings
                  field={design.front.department}
                  onChange={(field) => updateFront({ department: field })}
                />
              </Section>

              <Section
                title="QR Code"
                expanded={expandedSections.has('front-qr')}
                onToggle={() => toggleSection('front-qr')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.front.qrCode.enabled}
                      onChange={(e) => updateFront({ qrCode: { ...design.front.qrCode, enabled: e.target.checked } })}
                    />
                    <span className="text-sm font-medium">Enable QR Code</span>
                  </label>
                  {design.front.qrCode.enabled && (
                    <>
                      <label className="text-sm font-medium">Position</label>
                      <select
                        className="w-full p-2 border rounded"
                        value={design.front.qrCode.position}
                        onChange={(e) => updateFront({ qrCode: { ...design.front.qrCode, position: e.target.value as any } })}
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="center">Center</option>
                      </select>
                      <label className="text-sm font-medium">Size (%)</label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={design.front.qrCode.size}
                        onChange={(e) => updateFront({ qrCode: { ...design.front.qrCode, size: parseFloat(e.target.value) || 25 } })}
                      />
                      <label className="text-sm font-medium">Margin (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={design.front.qrCode.margin}
                        onChange={(e) => updateFront({ qrCode: { ...design.front.qrCode, margin: parseFloat(e.target.value) || 5 } })}
                      />
                    </>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* Back Side Settings */}
          {activeTab === 'back' && (
            <div className="space-y-4">
              <Section
                title="Background"
                expanded={expandedSections.has('back-bg')}
                onToggle={() => toggleSection('back-bg')}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Background Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={design.back.backgroundColor}
                      onChange={(e) => updateBack({ backgroundColor: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      value={design.back.backgroundColor}
                      onChange={(e) => updateBack({ backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </Section>

              <Section
                title="Company Info"
                expanded={expandedSections.has('back-company')}
                onToggle={() => toggleSection('back-company')}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={design.back.companyInfo?.enabled || false}
                      onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, enabled: e.target.checked } as any })}
                    />
                    <span className="text-sm font-medium">Enable Company Info</span>
                  </label>
                  {design.back.companyInfo?.enabled && (
                    <>
                      <label className="text-sm font-medium">Company Name</label>
                      <Input
                        type="text"
                        value={design.back.companyInfo?.name || ''}
                        onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, name: e.target.value } as any })}
                      />
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        type="text"
                        value={design.back.companyInfo?.address || ''}
                        onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, address: e.target.value } as any })}
                      />
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        type="text"
                        value={design.back.companyInfo?.phone || ''}
                        onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, phone: e.target.value } as any })}
                      />
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={design.back.companyInfo?.email || ''}
                        onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, email: e.target.value } as any })}
                      />
                      <label className="text-sm font-medium">Website</label>
                      <Input
                        type="url"
                        value={design.back.companyInfo?.website || ''}
                        onChange={(e) => updateBack({ companyInfo: { ...design.back.companyInfo, website: e.target.value } as any })}
                      />
                    </>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onSave} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Design
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Preview */}
      <div className="flex-1 overflow-auto">
        {/* Preview will be shown here by parent component */}
      </div>
    </div>
  )
}

function Section({
  title,
  expanded,
  onToggle,
  children
}: {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between text-left font-medium hover:bg-gray-50"
      >
        <span>{title}</span>
        <span>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && <div className="p-3 pt-0 space-y-2">{children}</div>}
    </div>
  )
}

function TextFieldSettings({
  field,
  onChange,
  showLabel = false
}: {
  field: any
  onChange: (field: any) => void
  showLabel?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.enabled}
          onChange={(e) => onChange({ ...field, enabled: e.target.checked })}
        />
        <span className="text-sm font-medium">Enable</span>
      </label>
      {field.enabled && (
        <>
          {showLabel && (
            <>
              <label className="text-sm font-medium">Label</label>
              <Input
                type="text"
                value={field.label || ''}
                onChange={(e) => onChange({ ...field, label: e.target.value })}
                placeholder="e.g., ID:"
              />
            </>
          )}
          <label className="text-sm font-medium">Font Size (mm)</label>
          <Input
            type="number"
            min="1"
            max="20"
            step="0.1"
            value={field.fontSize}
            onChange={(e) => onChange({ ...field, fontSize: parseFloat(e.target.value) || 12 })}
          />
          <label className="text-sm font-medium">Font Weight</label>
          <select
            className="w-full p-2 border rounded"
            value={field.fontWeight}
            onChange={(e) => onChange({ ...field, fontWeight: e.target.value })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={field.color}
              onChange={(e) => onChange({ ...field, color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              type="text"
              value={field.color}
              onChange={(e) => onChange({ ...field, color: e.target.value })}
              className="flex-1"
            />
          </div>
          <label className="text-sm font-medium">Position X (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={field.position.x}
            onChange={(e) => onChange({ ...field, position: { ...field.position, x: parseFloat(e.target.value) || 0 } })}
          />
          <label className="text-sm font-medium">Position Y (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={field.position.y}
            onChange={(e) => onChange({ ...field, position: { ...field.position, y: parseFloat(e.target.value) || 0 } })}
          />
          <label className="text-sm font-medium">Alignment</label>
          <select
            className="w-full p-2 border rounded"
            value={field.alignment}
            onChange={(e) => onChange({ ...field, alignment: e.target.value })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </>
      )}
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { KPIRecord, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X } from 'lucide-react'

interface KPITableWithCustomizationProps {
  kpis: KPIRecord[]
  projects: Project[]
  onEdit: (kpi: KPIRecord) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

// Default column configuration for KPI - Enhanced Standard View with Advanced Analytics
const defaultKPIColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true },
  { id: 'project_info', label: 'Project Info', visible: true, order: 1 },
  { id: 'activity_details', label: 'Activity Details', visible: true, order: 2 },
  { id: 'quantity_analysis', label: 'Quantity Analysis', visible: true, order: 3 },
  { id: 'financial_analysis', label: 'Financial Analysis', visible: true, order: 4 },
  { id: 'timeline_analysis', label: 'Timeline Analysis', visible: true, order: 5 },
  { id: 'progress_analysis', label: 'Progress Analysis', visible: true, order: 6 },
  { id: 'performance_score', label: 'Performance Score', visible: true, order: 7 },
  { id: 'efficiency_metrics', label: 'Efficiency Metrics', visible: true, order: 8 },
  { id: 'risk_assessment', label: 'Risk Assessment', visible: true, order: 9 },
  { id: 'quality_indicators', label: 'Quality Indicators', visible: true, order: 10 },
  { id: 'smart_insights', label: 'Smart Insights', visible: true, order: 11 },
  { id: 'recommendations', label: 'Recommendations', visible: true, order: 12 },
  { id: 'actions', label: 'Actions', visible: true, order: 13, fixed: true }
]

export function KPITableWithCustomization({ 
  kpis, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete 
}: KPITableWithCustomizationProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultKPIColumns, 
    storageKey: 'kpi' 
  })

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(kpis.map(kpi => kpi.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }

  // Enhanced Analysis Functions with Advanced Calculations
  const getProjectName = (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    return project?.project_name || projectCode
  }

  // Calculate Advanced Performance Score with Multiple Factors
  const calculateAdvancedPerformanceScore = (kpi: KPIRecord) => {
    let score = 0
    let factors = 0
    
    // Progress Factor (30%)
    if (kpi.progress_percentage !== undefined) {
      score += (kpi.progress_percentage / 100) * 30
      factors += 30
    }
    
    // Timeline Factor (25%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 0) score += 25 // On time or early
      else if (daysDiff <= 7) score += 20 // 1 week late
      else if (daysDiff <= 30) score += 15 // 1 month late
      else if (daysDiff <= 90) score += 10 // 3 months late
      else score += 5 // Very late
      factors += 25
    }
    
    // Financial Factor (25%)
    if (kpi.planned_value && kpi.actual_value) {
      const variance = ((kpi.actual_value - kpi.planned_value) / kpi.planned_value) * 100
      if (variance <= 5) score += 25 // Within 5% budget
      else if (variance <= 15) score += 20 // Within 15% budget
      else if (variance <= 30) score += 15 // Within 30% budget
      else if (variance <= 50) score += 10 // Within 50% budget
      else score += 5 // Over budget
      factors += 25
    }
    
    // Quality Factor (20%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage >= 95) score += 20 // Excellent
      else if (kpi.progress_percentage >= 85) score += 15 // Very good
      else if (kpi.progress_percentage >= 70) score += 10 // Good
      else if (kpi.progress_percentage >= 50) score += 5 // Average
      factors += 20
    }
    
    return factors > 0 ? Math.min(100, Math.max(0, (score / factors) * 100)) : 0
  }

  // Calculate Efficiency with Advanced Metrics
  const calculateAdvancedEfficiency = (kpi: KPIRecord) => {
    let efficiency = 0
    let metrics = 0
    
    // Quantity Efficiency (40%)
    if (kpi.quantity && kpi.planned_value) {
      const rate = kpi.quantity / kpi.planned_value
      if (rate > 1.2) efficiency += 40 // 20% above target
      else if (rate > 1.0) efficiency += 35 // At or above target
      else if (rate > 0.8) efficiency += 25 // Within 20% of target
      else if (rate > 0.6) efficiency += 15 // Within 40% of target
      else efficiency += 5 // Below target
      metrics += 40
    }
    
    // Time Efficiency (35%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 0) efficiency += 35 // On time
      else if (daysDiff <= 3) efficiency += 30 // 3 days late
      else if (daysDiff <= 7) efficiency += 25 // 1 week late
      else if (daysDiff <= 14) efficiency += 20 // 2 weeks late
      else if (daysDiff <= 30) efficiency += 15 // 1 month late
      else efficiency += 5 // Very late
      metrics += 35
    }
    
    // Resource Efficiency (25%)
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage > 0) {
      const resourceEfficiency = kpi.progress_percentage / 100
      efficiency += resourceEfficiency * 25
      metrics += 25
    }
    
    return metrics > 0 ? Math.min(100, Math.max(0, (efficiency / metrics) * 100)) : 0
  }

  // Calculate Risk Level with Advanced Assessment
  const calculateAdvancedRiskLevel = (kpi: KPIRecord) => {
    let riskScore = 0
    let riskFactors = 0
    
    // Progress Risk (30%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage < 25) riskScore += 30
      else if (kpi.progress_percentage < 50) riskScore += 20
      else if (kpi.progress_percentage < 75) riskScore += 10
      riskFactors += 30
    }
    
    // Timeline Risk (25%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 90) riskScore += 25
      else if (daysDiff > 30) riskScore += 20
      else if (daysDiff > 14) riskScore += 15
      else if (daysDiff > 7) riskScore += 10
      else if (daysDiff > 0) riskScore += 5
      riskFactors += 25
    }
    
    // Financial Risk (25%)
    if (kpi.variance_percentage !== undefined) {
      if (kpi.variance_percentage > 50) riskScore += 25
      else if (kpi.variance_percentage > 25) riskScore += 20
      else if (kpi.variance_percentage > 15) riskScore += 15
      else if (kpi.variance_percentage > 5) riskScore += 10
      riskFactors += 25
    }
    
    // Quality Risk (20%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage < 30) riskScore += 20
      else if (kpi.progress_percentage < 50) riskScore += 15
      else if (kpi.progress_percentage < 70) riskScore += 10
      else if (kpi.progress_percentage < 85) riskScore += 5
      riskFactors += 20
    }
    
    const riskPercentage = riskFactors > 0 ? (riskScore / riskFactors) * 100 : 0
    
    if (riskPercentage >= 70) return { level: 'high', score: riskPercentage, color: 'red' }
    if (riskPercentage >= 40) return { level: 'medium', score: riskPercentage, color: 'yellow' }
    if (riskPercentage >= 20) return { level: 'low', score: riskPercentage, color: 'green' }
    return { level: 'minimal', score: riskPercentage, color: 'blue' }
  }

  // Calculate Smart Insights with Advanced Logic
  const getSmartInsights = (kpi: KPIRecord) => {
    const insights = []
    
    // Progress Insights
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage >= 100) {
        insights.push({ type: 'success', message: 'Activity completed successfully', icon: '🎉' })
      } else if (kpi.progress_percentage >= 90) {
        insights.push({ type: 'warning', message: 'Near completion', icon: '🔥' })
      } else if (kpi.progress_percentage >= 75) {
        insights.push({ type: 'info', message: 'Excellent progress', icon: '⚡' })
      } else if (kpi.progress_percentage >= 50) {
        insights.push({ type: 'info', message: 'Good progress', icon: '📈' })
      } else if (kpi.progress_percentage >= 25) {
        insights.push({ type: 'warning', message: 'Promising start', icon: '🚀' })
      } else {
        insights.push({ type: 'info', message: 'Just started', icon: '⏳' })
      }
    }
    
    // Financial Insights
    if (kpi.variance_percentage !== undefined) {
      if (kpi.variance_percentage > 20) {
        insights.push({ type: 'error', message: 'Budget overrun', icon: '💰' })
      } else if (kpi.variance_percentage > 5) {
        insights.push({ type: 'warning', message: 'Approaching budget limit', icon: '⚠️' })
      } else if (kpi.variance_percentage > -5) {
        insights.push({ type: 'success', message: 'Within budget', icon: '✅' })
      } else {
        insights.push({ type: 'success', message: 'Budget savings', icon: '💎' })
      }
    }
    
    // Timeline Insights
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 30) {
        insights.push({ type: 'error', message: 'Major delay', icon: '🚨' })
      } else if (daysDiff > 7) {
        insights.push({ type: 'warning', message: 'Moderate delay', icon: '⏰' })
      } else if (daysDiff > 0) {
        insights.push({ type: 'info', message: 'Minor delay', icon: '📅' })
      } else {
        insights.push({ type: 'success', message: 'On time or early', icon: '🎯' })
      }
    }
    
    return insights.length > 0 ? insights : [{ type: 'info', message: 'Insufficient data for analysis', icon: '📊' }]
  }

  // Calculate Smart Recommendations with Advanced Logic
  const getSmartRecommendations = (kpi: KPIRecord) => {
    const recommendations = []
    
    // Progress-based Recommendations
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage < 50) {
      recommendations.push({ type: 'action', message: 'Increase resource allocation', icon: '🚀' })
      recommendations.push({ type: 'action', message: 'Review timeline planning', icon: '📋' })
    }
    
    // Financial Recommendations
    if (kpi.variance_percentage !== undefined && kpi.variance_percentage > 15) {
      recommendations.push({ type: 'action', message: 'Review cost structure', icon: '💰' })
      recommendations.push({ type: 'action', message: 'Analyze overrun causes', icon: '📊' })
    }
    
    // Timeline Recommendations
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 14) {
        recommendations.push({ type: 'action', message: 'Accelerate work pace', icon: '⏰' })
        recommendations.push({ type: 'action', message: 'Increase team size', icon: '👥' })
      }
    }
    
    // Quality Recommendations
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage > 90) {
      recommendations.push({ type: 'action', message: 'Focus on quality', icon: '⭐' })
      recommendations.push({ type: 'action', message: 'Final review', icon: '🔍' })
    }
    
    return recommendations.length > 0 ? recommendations : [{ type: 'info', message: 'Everything is going well', icon: '✅' }]
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('ar-SA')
    } catch {
      return 'Invalid Date'
    }
  }

  // Render cell content based on column - Enhanced Standard View with Advanced Analytics
  const renderCell = (kpi: KPIRecord, column: ColumnConfig) => {
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedIds.includes(kpi.id)}
            onChange={(e) => handleSelectOne(kpi.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      
      case 'project_info':
        const project = projects.find(p => p.project_code === kpi.project_code)
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white">
              {kpi.project_code}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {getProjectName(kpi.project_code || '')}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project?.project_type || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project?.responsible_division || 'N/A'}
            </div>
          </div>
        )
      
      case 'activity_details':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {kpi.activity_name}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {kpi.activity || 'N/A'}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                {kpi.unit}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                {kpi.quantity}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.section || 'N/A'} • {kpi.zone || 'N/A'}
            </div>
          </div>
        )
      
      case 'quantity_analysis':
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Quantity</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpi.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Unit</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpi.unit}
              </span>
            </div>
            {kpi.drilled_meters && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Drilled Meters</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {kpi.drilled_meters}m
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.recorded_by ? `Recorded by: ${kpi.recorded_by}` : 'Auto recorded'}
            </div>
          </div>
        )
      
      case 'financial_analysis':
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Planned</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpi.planned_value ? `$${kpi.planned_value.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Actual</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpi.actual_value ? `$${kpi.actual_value.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            {kpi.variance_percentage && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Variance</span>
                <span className={`text-sm font-medium ${
                  kpi.variance_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.variance_percentage.toFixed(1)}%
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {               kpi.variance_percentage && kpi.variance_percentage > 20 ? '🚨 Major budget overrun' :
               kpi.variance_percentage && kpi.variance_percentage > 5 ? '⚠️ Budget overrun' :
               kpi.variance_percentage && kpi.variance_percentage > -5 ? '✅ Within budget' : '💎 Budget savings'}
            </div>
          </div>
        )
      
      case 'timeline_analysis':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Target</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(kpi.target_date || '')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Actual</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(kpi.actual_date || '')}
              </span>
            </div>
            {kpi.target_date && kpi.actual_date && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {(() => {
                  const targetDate = new Date(kpi.target_date)
                  const actualDate = new Date(kpi.actual_date)
                  const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
                  return daysDiff > 0 ? `${daysDiff} days late` : `${Math.abs(daysDiff)} days early`
                })()}
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.target_date && kpi.actual_date && (() => {
                const targetDate = new Date(kpi.target_date)
                const actualDate = new Date(kpi.actual_date)
                const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
                return daysDiff > 30 ? '🚨 Major delay' : daysDiff > 7 ? '⚠️ Moderate delay' : daysDiff > 0 ? '📅 Minor delay' : '🎯 On time'
              })()}
            </div>
          </div>
        )
      
      case 'progress_analysis':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {kpi.progress_percentage ? `${kpi.progress_percentage.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${kpi.progress_percentage || 0}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.progress_percentage && kpi.progress_percentage >= 100 ? 'Completed' :
               kpi.progress_percentage && kpi.progress_percentage >= 75 ? 'Near completion' :
               kpi.progress_percentage && kpi.progress_percentage >= 50 ? 'In progress' :
               kpi.progress_percentage && kpi.progress_percentage >= 25 ? 'Started' : 'Not started'}
            </div>
          </div>
        )
      
      case 'performance_score':
        const performanceScore = calculateAdvancedPerformanceScore(kpi)
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance Score</span>
              <span className={`text-sm font-bold ${
                performanceScore >= 80 ? 'text-green-600' :
                performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {performanceScore.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  performanceScore >= 80 ? 'bg-green-500' :
                  performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${performanceScore}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Needs improvement'}
            </div>
          </div>
        )
      
      case 'efficiency_metrics':
        const efficiencyScore = calculateAdvancedEfficiency(kpi)
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Efficiency</span>
              <span className={`text-sm font-bold ${
                efficiencyScore >= 80 ? 'text-green-600' :
                efficiencyScore >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {efficiencyScore.toFixed(0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  efficiencyScore >= 80 ? 'bg-green-500' :
                  efficiencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${efficiencyScore}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {efficiencyScore >= 80 ? 'High efficiency' : efficiencyScore >= 60 ? 'Good efficiency' : 'Low efficiency'}
            </div>
          </div>
        )
      
      case 'risk_assessment':
        const riskLevel = calculateAdvancedRiskLevel(kpi)
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                riskLevel.color === 'red' ? 'bg-red-500' :
                riskLevel.color === 'yellow' ? 'bg-yellow-500' :
                riskLevel.color === 'green' ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <span className={`text-sm font-medium capitalize ${
                riskLevel.color === 'red' ? 'text-red-600' :
                riskLevel.color === 'yellow' ? 'text-yellow-600' :
                riskLevel.color === 'green' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {riskLevel.level === 'high' ? 'High risk' :
                 riskLevel.level === 'medium' ? 'Medium risk' :
                 riskLevel.level === 'low' ? 'Low risk' : 'Minimal risk'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Risk score: {riskLevel.score.toFixed(0)}%
            </div>
          </div>
        )
      
      case 'quality_indicators':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {kpi.progress_percentage && kpi.progress_percentage >= 90 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : kpi.progress_percentage && kpi.progress_percentage >= 75 ? (
                <Clock className="h-4 w-4 text-yellow-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {kpi.progress_percentage && kpi.progress_percentage >= 90 ? 'Excellent' :
                 kpi.progress_percentage && kpi.progress_percentage >= 75 ? 'Good' :
                 kpi.progress_percentage && kpi.progress_percentage >= 50 ? 'Average' : 'Needs improvement'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.notes || 'No notes'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {kpi.progress_percentage && kpi.progress_percentage >= 90 ? '⭐ High quality' :
               kpi.progress_percentage && kpi.progress_percentage >= 75 ? '📊 Good quality' :
               kpi.progress_percentage && kpi.progress_percentage >= 50 ? '⚠️ Average quality' : '🚨 Low quality'}
            </div>
          </div>
        )
      
      case 'smart_insights':
        const insights = getSmartInsights(kpi)
        return (
          <div className="space-y-1 max-w-xs">
            {insights.map((insight, index) => (
              <div key={index} className={`text-xs px-2 py-1 rounded ${
                insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                insight.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                insight.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
              }`}>
                {insight.icon} {insight.message}
              </div>
            ))}
          </div>
        )
      
      case 'recommendations':
        const recommendations = getSmartRecommendations(kpi)
        return (
          <div className="space-y-1 max-w-xs">
            {recommendations.map((rec, index) => (
              <div key={index} className={`text-xs px-2 py-1 rounded ${
                rec.type === 'action' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200' :
                'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              }`}>
                {rec.icon} {rec.message}
              </div>
            ))}
          </div>
        )
      
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(kpi)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(kpi.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        )
      
      default:
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {kpi[column.id as keyof KPIRecord] as string}
          </span>
        )
    }
  }

  const visibleColumns = columns.filter(col => col.visible).sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            KPI Records ({kpis.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Customize Columns
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr
                key={kpi.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-4 py-3 text-sm"
                  >
                    {renderCell(kpi, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && (
        <ColumnCustomizer
          columns={columns}
          onColumnsChange={saveConfiguration}
          onClose={() => setShowCustomizer(false)}
          title="Customize KPI Table Columns"
          storageKey="kpi"
        />
      )}
    </div>
  )
}
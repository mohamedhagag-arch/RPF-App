'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X } from 'lucide-react'

interface ProjectsTableWithCustomizationProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

// Default column configuration for Projects - Enhanced Standard View with Advanced Analytics
const defaultProjectsColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true },
  { id: 'project_info', label: 'Project Info', visible: true, order: 1 },
  { id: 'project_details', label: 'Project Details', visible: true, order: 2 },
  { id: 'financial_analysis', label: 'Financial Analysis', visible: true, order: 3 },
  { id: 'timeline_analysis', label: 'Timeline Analysis', visible: true, order: 4 },
  { id: 'status_analysis', label: 'Status Analysis', visible: true, order: 5 },
  { id: 'performance_score', label: 'Performance Score', visible: true, order: 6 },
  { id: 'efficiency_metrics', label: 'Efficiency Metrics', visible: true, order: 7 },
  { id: 'risk_assessment', label: 'Risk Assessment', visible: true, order: 8 },
  { id: 'quality_indicators', label: 'Quality Indicators', visible: true, order: 9 },
  { id: 'smart_insights', label: 'Smart Insights', visible: true, order: 10 },
  { id: 'recommendations', label: 'Recommendations', visible: true, order: 11 },
  { id: 'actions', label: 'Actions', visible: true, order: 12, fixed: true }
]

export function ProjectsTableWithCustomization({ 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete 
}: ProjectsTableWithCustomizationProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultProjectsColumns, 
    storageKey: 'projects' 
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
      setSelectedIds(projects.map(project => project.id))
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
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green'
      case 'on-going': return 'blue'
      case 'on-hold': return 'yellow'
      case 'cancelled': return 'red'
      case 'upcoming': return 'gray'
      default: return 'gray'
    }
  }

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'on-going': return <Activity className="h-4 w-4 text-blue-500" />
      case 'on-hold': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'upcoming': return <Calendar className="h-4 w-4 text-gray-500" />
      default: return <Building className="h-4 w-4 text-gray-500" />
    }
  }

  // Calculate Advanced Performance Score with Multiple Factors
  const calculateAdvancedPerformanceScore = (project: Project) => {
    let score = 0
    let factors = 0
    
    // Status Factor (30%)
    switch (project.project_status) {
      case 'completed': score += 30; break
      case 'on-going': score += 25; break
      case 'on-hold': score += 15; break
      case 'cancelled': score += 5; break
      case 'upcoming': score += 20; break
      default: score += 10; break
    }
    factors += 30
    
    // Financial Factor (25%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) score += 25 // Large project
      else if (project.contract_amount >= 1000000) score += 20 // Medium project
      else if (project.contract_amount >= 100000) score += 15 // Small project
      else score += 10 // Very small project
      factors += 25
    }
    
    // Timeline Factor (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward <= 30) score += 25 // Recent award
      else if (daysSinceAward <= 90) score += 20 // Within 3 months
      else if (daysSinceAward <= 365) score += 15 // Within 1 year
      else if (daysSinceAward <= 730) score += 10 // Within 2 years
      else score += 5 // Very old project
      factors += 25
    }
    
    // Quality Factor (20%)
    if (project.kpi_completed) {
      score += 20 // KPI completed
    } else {
      score += 10 // KPI not completed
    }
    factors += 20
    
    return factors > 0 ? Math.min(100, Math.max(0, (score / factors) * 100)) : 0
  }

  // Calculate Efficiency with Advanced Metrics
  const calculateAdvancedEfficiency = (project: Project) => {
    let efficiency = 0
    let metrics = 0
    
    // Status Efficiency (40%)
    switch (project.project_status) {
      case 'completed': efficiency += 40; break
      case 'on-going': efficiency += 35; break
      case 'on-hold': efficiency += 20; break
      case 'cancelled': efficiency += 5; break
      case 'upcoming': efficiency += 30; break
      default: efficiency += 15; break
    }
    metrics += 40
    
    // Financial Efficiency (35%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) efficiency += 35 // Large project
      else if (project.contract_amount >= 1000000) efficiency += 30 // Medium project
      else if (project.contract_amount >= 100000) efficiency += 25 // Small project
      else efficiency += 20 // Very small project
      metrics += 35
    }
    
    // Timeline Efficiency (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward <= 30) efficiency += 25 // Recent award
      else if (daysSinceAward <= 90) efficiency += 20 // Within 3 months
      else if (daysSinceAward <= 365) efficiency += 15 // Within 1 year
      else if (daysSinceAward <= 730) efficiency += 10 // Within 2 years
      else efficiency += 5 // Very old project
      metrics += 25
    }
    
    return metrics > 0 ? Math.min(100, Math.max(0, (efficiency / metrics) * 100)) : 0
  }

  // Calculate Risk Level with Advanced Assessment
  const calculateAdvancedRiskLevel = (project: Project) => {
    let riskScore = 0
    let riskFactors = 0
    
    // Status Risk (30%)
    switch (project.project_status) {
      case 'cancelled': riskScore += 30; break
      case 'on-hold': riskScore += 25; break
      case 'on-going': riskScore += 10; break
      case 'completed': riskScore += 5; break
      case 'upcoming': riskScore += 15; break
      default: riskScore += 20; break
    }
    riskFactors += 30
    
    // Financial Risk (25%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) riskScore += 25 // Large project risk
      else if (project.contract_amount >= 1000000) riskScore += 20 // Medium project risk
      else if (project.contract_amount >= 100000) riskScore += 15 // Small project risk
      else riskScore += 10 // Very small project risk
      riskFactors += 25
    }
    
    // Timeline Risk (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 730) riskScore += 25 // Very old project
      else if (daysSinceAward > 365) riskScore += 20 // Old project
      else if (daysSinceAward > 90) riskScore += 15 // Medium age project
      else if (daysSinceAward > 30) riskScore += 10 // Recent project
      else riskScore += 5 // Very recent project
      riskFactors += 25
    }
    
    // Quality Risk (20%)
    if (project.kpi_completed) {
      riskScore += 5 // KPI completed
    } else {
      riskScore += 20 // KPI not completed
    }
    riskFactors += 20
    
    const riskPercentage = riskFactors > 0 ? (riskScore / riskFactors) * 100 : 0
    
    if (riskPercentage >= 70) return { level: 'high', score: riskPercentage, color: 'red' }
    if (riskPercentage >= 40) return { level: 'medium', score: riskPercentage, color: 'yellow' }
    if (riskPercentage >= 20) return { level: 'low', score: riskPercentage, color: 'green' }
    return { level: 'minimal', score: riskPercentage, color: 'blue' }
  }

  // Calculate Smart Insights with Advanced Logic
  const getSmartInsights = (project: Project) => {
    const insights = []
    
    // Status Insights
    switch (project.project_status) {
      case 'completed':
        insights.push({ type: 'success', message: 'Project completed successfully', icon: '🎉' })
        break
      case 'on-going':
        insights.push({ type: 'info', message: 'Project in progress', icon: '⚡' })
        break
      case 'on-hold':
        insights.push({ type: 'warning', message: 'Project on hold', icon: '⏸️' })
        break
      case 'cancelled':
        insights.push({ type: 'error', message: 'Project cancelled', icon: '❌' })
        break
      case 'upcoming':
        insights.push({ type: 'info', message: 'Project upcoming', icon: '📅' })
        break
      default:
        insights.push({ type: 'info', message: 'Project status unknown', icon: '❓' })
        break
    }
    
    // Financial Insights
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) {
        insights.push({ type: 'info', message: 'Large project', icon: '💰' })
      } else if (project.contract_amount >= 1000000) {
        insights.push({ type: 'info', message: 'Medium project', icon: '💵' })
      } else if (project.contract_amount >= 100000) {
        insights.push({ type: 'info', message: 'Small project', icon: '💸' })
      } else {
        insights.push({ type: 'info', message: 'Very small project', icon: '💳' })
      }
    }
    
    // Timeline Insights
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 730) {
        insights.push({ type: 'warning', message: 'Very old project', icon: '⏰' })
      } else if (daysSinceAward > 365) {
        insights.push({ type: 'info', message: 'Old project', icon: '📅' })
      } else if (daysSinceAward > 90) {
        insights.push({ type: 'info', message: 'Medium age project', icon: '📆' })
      } else if (daysSinceAward > 30) {
        insights.push({ type: 'info', message: 'Recent project', icon: '🆕' })
      } else {
        insights.push({ type: 'info', message: 'Very recent project', icon: '✨' })
      }
    }
    
    // KPI Insights
    if (project.kpi_completed) {
      insights.push({ type: 'success', message: 'KPI completed', icon: '✅' })
    } else {
      insights.push({ type: 'warning', message: 'KPI not completed', icon: '⚠️' })
    }
    
    return insights.length > 0 ? insights : [{ type: 'info', message: 'Insufficient data for analysis', icon: '📊' }]
  }

  // Calculate Smart Recommendations with Advanced Logic
  const getSmartRecommendations = (project: Project) => {
    const recommendations = []
    
    // Status-based Recommendations
    switch (project.project_status) {
      case 'on-hold':
        recommendations.push({ type: 'action', message: 'Resume project activities', icon: '🚀' })
        recommendations.push({ type: 'action', message: 'Review hold reasons', icon: '📋' })
        break
      case 'on-going':
        recommendations.push({ type: 'action', message: 'Monitor progress closely', icon: '👀' })
        recommendations.push({ type: 'action', message: 'Ensure quality standards', icon: '⭐' })
        break
      case 'upcoming':
        recommendations.push({ type: 'action', message: 'Prepare project resources', icon: '🛠️' })
        recommendations.push({ type: 'action', message: 'Finalize project plan', icon: '📝' })
        break
      case 'cancelled':
        recommendations.push({ type: 'action', message: 'Analyze cancellation reasons', icon: '🔍' })
        recommendations.push({ type: 'action', message: 'Learn from experience', icon: '📚' })
        break
    }
    
    // Financial Recommendations
    if (project.contract_amount && project.contract_amount >= 10000000) {
      recommendations.push({ type: 'action', message: 'Implement strict monitoring', icon: '📊' })
      recommendations.push({ type: 'action', message: 'Regular financial reviews', icon: '💰' })
    }
    
    // Timeline Recommendations
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 365) {
        recommendations.push({ type: 'action', message: 'Review project timeline', icon: '⏰' })
        recommendations.push({ type: 'action', message: 'Assess project viability', icon: '🔍' })
      }
    }
    
    // KPI Recommendations
    if (!project.kpi_completed) {
      recommendations.push({ type: 'action', message: 'Complete KPI setup', icon: '📈' })
      recommendations.push({ type: 'action', message: 'Implement tracking system', icon: '📊' })
    }
    
    return recommendations.length > 0 ? recommendations : [{ type: 'info', message: 'Everything is going well', icon: '✅' }]
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US')
    } catch {
      return 'Invalid Date'
    }
  }

  // Render cell content based on column - Enhanced Standard View with Advanced Analytics
  const renderCell = (project: Project, column: ColumnConfig) => {
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedIds.includes(project.id)}
            onChange={(e) => handleSelectOne(project.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      
      case 'project_info':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white">
              {project.project_code}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {project.project_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.project_sub_code || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.plot_number || 'N/A'}
            </div>
          </div>
        )
      
      case 'project_details':
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {project.project_type}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {project.responsible_division || 'N/A'}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                {project.client_name || 'N/A'}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                {project.consultant_name || 'N/A'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.first_party_name || 'N/A'}
            </div>
          </div>
        )
      
      case 'financial_analysis':
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Contract Amount</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.contract_amount ? `$${project.contract_amount.toLocaleString()}` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Currency</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.currency || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Contract Status</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.contract_status || 'N/A'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.contract_amount && project.contract_amount >= 10000000 ? '💰 Large project' :
               project.contract_amount && project.contract_amount >= 1000000 ? '💵 Medium project' :
               project.contract_amount && project.contract_amount >= 100000 ? '💸 Small project' : '💳 Very small project'}
            </div>
          </div>
        )
      
      case 'timeline_analysis':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Award Date</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(project.date_project_awarded || '')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Created</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(project.created_at || '')}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.work_programme || 'No work programme'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.date_project_awarded && (() => {
                const awardDate = new Date(project.date_project_awarded)
                const today = new Date()
                const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
                return daysSinceAward > 730 ? '⏰ Very old project' : daysSinceAward > 365 ? '📅 Old project' : daysSinceAward > 90 ? '📆 Medium age' : daysSinceAward > 30 ? '🆕 Recent' : '✨ Very recent'
              })()}
            </div>
          </div>
        )
      
      case 'status_analysis':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getProjectStatusIcon(project.project_status)}
              <span className={`text-sm font-medium capitalize ${
                getProjectStatusColor(project.project_status) === 'green' ? 'text-green-600' :
                getProjectStatusColor(project.project_status) === 'blue' ? 'text-blue-600' :
                getProjectStatusColor(project.project_status) === 'yellow' ? 'text-yellow-600' :
                getProjectStatusColor(project.project_status) === 'red' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {project.project_status?.replace('-', ' ') || 'Unknown'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.kpi_completed ? '✅ KPI Completed' : '⚠️ KPI Not Completed'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.project_status === 'completed' ? '🎉 Project completed' :
               project.project_status === 'on-going' ? '⚡ Project in progress' :
               project.project_status === 'on-hold' ? '⏸️ Project on hold' :
               project.project_status === 'cancelled' ? '❌ Project cancelled' :
               project.project_status === 'upcoming' ? '📅 Project upcoming' : '❓ Status unknown'}
            </div>
          </div>
        )
      
      case 'performance_score':
        const performanceScore = calculateAdvancedPerformanceScore(project)
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
        const efficiencyScore = calculateAdvancedEfficiency(project)
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
        const riskLevel = calculateAdvancedRiskLevel(project)
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
                {riskLevel.level === 'high' ? 'High Risk' :
                 riskLevel.level === 'medium' ? 'Medium Risk' :
                 riskLevel.level === 'low' ? 'Low Risk' : 'Minimal Risk'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Risk Score: {riskLevel.score.toFixed(0)}%
            </div>
          </div>
        )
      
      case 'quality_indicators':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {project.kpi_completed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.kpi_completed ? 'KPI Completed' : 'KPI Not Completed'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.project_manager_email || 'No manager email'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.area_manager_email || 'No area manager email'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {project.kpi_completed ? '⭐ High quality' : '🚨 Needs attention'}
            </div>
          </div>
        )
      
      case 'smart_insights':
        const insights = getSmartInsights(project)
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
        const recommendations = getSmartRecommendations(project)
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
              onClick={() => onEdit(project)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(project.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        )
      
      default:
        return (
          <span className="text-gray-500 dark:text-gray-400">
            {project[column.id as keyof Project] as string}
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
            Projects ({projects.length})
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
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-4 py-3 text-sm"
                  >
                    {renderCell(project, column)}
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
          title="Customize Projects Table Columns"
          storageKey="projects"
        />
      )}
    </div>
  )
}
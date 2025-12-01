'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Database,
  Download,
  Upload,
  Settings,
  Users,
  Briefcase,
  Link,
  RefreshCw,
  Archive,
  Trash2,
  Plus,
  Edit,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

// Import the specialized components
import { ExportImportManager } from './ExportImportManager'
import { BulkOperationsManager } from './BulkOperationsManager'
import { IntegrationManager } from './IntegrationManager'

type TabType = 'departments' | 'job_titles' | 'export_import' | 'bulk_operations' | 'integration'

export function AdvancedDepartmentsJobTitlesManager() {
  const [activeTab, setActiveTab] = useState<TabType>('departments')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tabs = [
    {
      id: 'departments' as TabType,
      label: 'Departments',
      icon: Users,
      description: 'Manage organizational departments'
    },
    {
      id: 'job_titles' as TabType,
      label: 'Job Titles',
      icon: Briefcase,
      description: 'Manage job titles and positions'
    },
    {
      id: 'export_import' as TabType,
      label: 'Export/Import',
      icon: Database,
      description: 'Export and import data'
    },
    {
      id: 'bulk_operations' as TabType,
      label: 'Bulk Operations',
      icon: Settings,
      description: 'Perform bulk operations'
    },
    {
      id: 'integration' as TabType,
      label: 'Integration',
      icon: Link,
      description: 'System integration and sync'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'departments':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Departments Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Departments Management
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Manage organizational departments and their hierarchy
                </p>
                <Button
                  onClick={() => setActiveTab('integration')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Departments
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'job_titles':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                Job Titles Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Job Titles Management
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Manage job titles and organizational positions
                </p>
                <Button
                  onClick={() => setActiveTab('integration')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure Job Titles
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case 'export_import':
        return <ExportImportManager />

      case 'bulk_operations':
        return <BulkOperationsManager />

      case 'integration':
        return <IntegrationManager />

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Advanced Departments & Job Titles Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Complete management system with export/import, bulk operations, and integration
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Export/Import</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export and import data in multiple formats
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Bulk Operations</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Perform bulk operations on multiple items
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Link className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900 dark:text-white">Integration</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              System integration and data synchronization
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          {success}
        </Alert>
      )}
    </div>
  )
}

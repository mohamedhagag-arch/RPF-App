'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Link,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Users,
  Briefcase,
  Settings,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Save,
  X,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react'

interface IntegrationStatus {
  departments_count: number
  job_titles_count: number
  users_with_departments: number
  users_with_job_titles: number
  orphaned_departments: number
  orphaned_job_titles: number
  inconsistent_data: number
}

interface IntegrationResult {
  success: boolean
  departments_synced: number
  job_titles_synced: number
  users_updated: number
  errors: string[]
  warnings: string[]
}

export function IntegrationManager() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [integrationResult, setIntegrationResult] = useState<IntegrationResult | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  // Load integration status
  useEffect(() => {
    loadIntegrationStatus()
  }, [])

  const loadIntegrationStatus = async () => {
    setLoading(true)
    try {
      // Get departments count
      const { count: deptCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })

      // Get job titles count
      const { count: jobCount } = await supabase
        .from('job_titles')
        .select('*', { count: 'exact', head: true })

      // Get users with departments
      const { count: usersWithDept } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('department_id', 'is', null)

      // Get users with job titles
      const { count: usersWithJob } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('job_title_id', 'is', null)

      // Get orphaned departments (not used by any user)
      const { data: orphanedDepts } = await supabase
        .from('departments')
        .select('id')
        .not('id', 'in', `(SELECT DISTINCT department_id FROM users WHERE department_id IS NOT NULL)`)

      // Get orphaned job titles (not used by any user)
      const { data: orphanedJobs } = await supabase
        .from('job_titles')
        .select('id')
        .not('id', 'in', `(SELECT DISTINCT job_title_id FROM users WHERE job_title_id IS NOT NULL)`)

      // Get inconsistent data (users with invalid references)
      const { data: inconsistentUsers } = await supabase
        .from('users')
        .select('id, department_id, job_title_id')
        .or('department_id.not.in.(SELECT id FROM departments),job_title_id.not.in.(SELECT id FROM job_titles)') as any

      setStatus({
        departments_count: deptCount || 0,
        job_titles_count: jobCount || 0,
        users_with_departments: usersWithDept || 0,
        users_with_job_titles: usersWithJob || 0,
        orphaned_departments: orphanedDepts?.length || 0,
        orphaned_job_titles: orphanedJobs?.length || 0,
        inconsistent_data: inconsistentUsers?.length || 0
      })

    } catch (err: any) {
      setError(`Failed to load integration status: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncIntegration = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🔄 Starting integration sync...')
      
      const result: IntegrationResult = {
        success: true,
        departments_synced: 0,
        job_titles_synced: 0,
        users_updated: 0,
        errors: [],
        warnings: []
      }

      // 1. Fix inconsistent user references
      const { data: inconsistentUsers } = await supabase
        .from('users')
        .select('id, department_id, job_title_id')
        .or('department_id.not.in.(SELECT id FROM departments),job_title_id.not.in.(SELECT id FROM job_titles)') as any

      if (inconsistentUsers && inconsistentUsers.length > 0) {
        for (const user of inconsistentUsers) {
          try {
            const updates: any = {}
            
            // Check if department exists
            if (user.department_id) {
              const { data: deptExists } = await supabase
                .from('departments')
                .select('id')
                .eq('id', user.department_id)
                .single()
              
              if (!deptExists) {
                updates.department_id = null
                result.warnings.push(`User ${user.id}: Invalid department reference removed`)
              }
            }

            // Check if job title exists
            if (user.job_title_id) {
              const { data: jobExists } = await supabase
                .from('job_titles')
                .select('id')
                .eq('id', user.job_title_id)
                .single()
              
              if (!jobExists) {
                updates.job_title_id = null
                result.warnings.push(`User ${user.id}: Invalid job title reference removed`)
              }
            }

            if (Object.keys(updates).length > 0) {
              const { error } = await (supabase as any)
                .from('users')
                .update(updates)
                .eq('id', user.id)

              if (error) {
                result.errors.push(`User ${user.id}: ${error.message}`)
              } else {
                result.users_updated++
              }
            }
          } catch (err: any) {
            result.errors.push(`User ${user.id}: ${err.message}`)
          }
        }
      }

      // 2. Update display orders for departments
      const { data: departments } = await supabase
        .from('departments')
        .select('*')
        .order('display_order', { ascending: true }) as any

      if (departments) {
        for (let i = 0; i < departments.length; i++) {
          const newOrder = i + 1
          if (departments[i].display_order !== newOrder) {
            const { error } = await (supabase as any)
              .from('departments')
              .update({ display_order: newOrder })
              .eq('id', departments[i].id)

            if (!error) {
              result.departments_synced++
            }
          }
        }
      }

      // 3. Update display orders for job titles
      const { data: jobTitles } = await supabase
        .from('job_titles')
        .select('*')
        .order('display_order', { ascending: true }) as any

      if (jobTitles) {
        for (let i = 0; i < jobTitles.length; i++) {
          const newOrder = i + 1
          if (jobTitles[i].display_order !== newOrder) {
            const { error } = await (supabase as any)
              .from('job_titles')
              .update({ display_order: newOrder })
              .eq('id', jobTitles[i].id)

            if (!error) {
              result.job_titles_synced++
            }
          }
        }
      }

      setIntegrationResult(result)
      
      if (result.errors.length === 0) {
        setSuccess(`✅ Integration sync completed successfully! ${result.departments_synced} departments, ${result.job_titles_synced} job titles, and ${result.users_updated} users updated.`)
      } else {
        setSuccess(`⚠️ Integration sync completed with ${result.errors.length} errors. ${result.departments_synced} departments, ${result.job_titles_synced} job titles, and ${result.users_updated} users updated.`)
      }

      // Reload status
      await loadIntegrationStatus()

    } catch (err: any) {
      console.error('❌ Integration sync error:', err)
      setError(`Integration sync failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCleanupOrphaned = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🧹 Cleaning up orphaned data...')
      
      // Get orphaned departments
      const { data: orphanedDepts } = await supabase
        .from('departments')
        .select('id, name_en')
        .not('id', 'in', `(SELECT DISTINCT department_id FROM users WHERE department_id IS NOT NULL)`) as any

      // Get orphaned job titles
      const { data: orphanedJobs } = await supabase
        .from('job_titles')
        .select('id, title_en')
        .not('id', 'in', `(SELECT DISTINCT job_title_id FROM users WHERE job_title_id IS NOT NULL)`) as any

      let deletedCount = 0
      const errors: string[] = []

      // Delete orphaned departments
      if (orphanedDepts && orphanedDepts.length > 0) {
        for (const dept of orphanedDepts) {
          const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', dept.id)

          if (error) {
            errors.push(`Department ${dept.name_en}: ${error.message}`)
          } else {
            deletedCount++
          }
        }
      }

      // Delete orphaned job titles
      if (orphanedJobs && orphanedJobs.length > 0) {
        for (const job of orphanedJobs) {
          const { error } = await supabase
            .from('job_titles')
            .delete()
            .eq('id', job.id)

          if (error) {
            errors.push(`Job Title ${job.title_en}: ${error.message}`)
          } else {
            deletedCount++
          }
        }
      }

      if (errors.length === 0) {
        setSuccess(`✅ Cleanup completed successfully! ${deletedCount} orphaned items removed.`)
      } else {
        setSuccess(`⚠️ Cleanup completed with ${errors.length} errors. ${deletedCount} orphaned items removed.`)
      }

      // Reload status
      await loadIntegrationStatus()

    } catch (err: any) {
      console.error('❌ Cleanup error:', err)
      setError(`Cleanup failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetIntegration = async () => {
    if (!confirm('Are you sure you want to reset all integration data? This will remove all user department and job title assignments.')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('🔄 Resetting integration data...')
      
      // Reset all user department and job title assignments
      const { error } = await (supabase as any)
        .from('users')
        .update({ 
          department_id: null, 
          job_title_id: null 
        })
        .not('department_id', 'is', null)
        .not('job_title_id', 'is', null)

      if (error) {
        throw error
      }

      setSuccess('✅ Integration data reset successfully! All user assignments have been cleared.')
      
      // Reload status
      await loadIntegrationStatus()

    } catch (err: any) {
      console.error('❌ Reset error:', err)
      setError(`Reset failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : status ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {status.departments_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Departments
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {status.job_titles_count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Job Titles
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {status.users_with_departments}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Users with Depts
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {status.users_with_job_titles}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Users with Jobs
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No status data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues Section */}
      {status && (status.orphaned_departments > 0 || status.orphaned_job_titles > 0 || status.inconsistent_data > 0) && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-5 h-5" />
              Integration Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {status.orphaned_departments > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {status.orphaned_departments}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Orphaned Departments
                  </div>
                </div>
              )}
              
              {status.orphaned_job_titles > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {status.orphaned_job_titles}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Orphaned Job Titles
                  </div>
                </div>
              )}
              
              {status.inconsistent_data > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {status.inconsistent_data}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Inconsistent Data
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            Integration Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleSyncIntegration}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync Integration
            </Button>
            
            <Button
              onClick={handleCleanupOrphaned}
              disabled={loading || (status?.orphaned_departments === 0 && status?.orphaned_job_titles === 0)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Cleanup Orphaned
            </Button>
            
            <Button
              onClick={handleResetIntegration}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Reset Integration
            </Button>
            
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              className="text-gray-600 hover:text-gray-800"
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Results */}
      {integrationResult && (
        <Card className={integrationResult.success ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {integrationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Integration Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {integrationResult.departments_synced}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Departments Synced
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {integrationResult.job_titles_synced}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Job Titles Synced
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {integrationResult.users_updated}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Users Updated
                </div>
              </div>
            </div>
            
            {integrationResult.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Warnings ({integrationResult.warnings.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {integrationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-600 dark:text-yellow-400">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {integrationResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  Errors ({integrationResult.errors.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {integrationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

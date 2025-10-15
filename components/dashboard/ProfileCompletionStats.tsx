'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getProfileCompletionStats } from '@/lib/profileCompletionGuard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import {
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react'

interface ProfileCompletionStatsData {
  totalUsers: number
  completedProfiles: number
  incompleteProfiles: number
  completionRate: number
  missingFieldsStats: Record<string, number>
}

export function ProfileCompletionStats() {
  const [stats, setStats] = useState<ProfileCompletionStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getProfileCompletionStats()
      setStats(data)
    } catch (err: any) {
      console.error('Error loading profile completion stats:', err)
      setError(err.message || 'Failed to load profile completion statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Profile Completion Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading stats...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Profile Completion Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error">
            <XCircle className="h-4 w-4" />
            {error}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400'
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getCompletionBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 dark:bg-green-900/20'
    if (rate >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Profile Completion Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Completed Profiles */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.completedProfiles}
                </p>
              </div>
            </div>
          </div>

          {/* Incomplete Profiles */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incomplete</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.incompleteProfiles}
                </p>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className={`${getCompletionBgColor(stats.completionRate)} p-4 rounded-lg`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getCompletionBgColor(stats.completionRate)}`}>
                <TrendingUp className={`h-5 w-5 ${getCompletionColor(stats.completionRate)}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                <p className={`text-2xl font-bold ${getCompletionColor(stats.completionRate)}`}>
                  {stats.completionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Overall Progress</span>
            <span className="font-medium">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                stats.completionRate >= 80 ? 'bg-green-500' :
                stats.completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Missing Fields Breakdown */}
        {stats.incompleteProfiles > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Missing Fields Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(stats.missingFieldsStats).map(([field, count]) => (
                <div key={field} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{field}</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {count} missing
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {stats.incompleteProfiles > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => window.location.href = '/settings?tab=users'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View User Management
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

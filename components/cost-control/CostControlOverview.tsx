'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { DollarSign, TrendingUp, TrendingDown, BarChart3, UserCheck, Database, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

export default function CostControlOverview() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalBudget: 0,
    actualCost: 0,
    variance: 0,
    costPerformance: 0,
    manpowerRecords: 0,
    totalHours: 0,
    totalManpowerCost: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      
      // Load MANPOWER stats
      const { count: manpowerCount, error: countError } = await supabase
        .from('CCD - MANPOWER')
        .select('*', { count: 'exact', head: true })
      
      // Load MANPOWER totals
      const { data: manpowerData, error: dataError } = await supabase
        .from('CCD - MANPOWER')
        .select('"Total Hours", Cost')
        .limit(10000) // Limit for performance
      
      if (countError) {
        console.error('Error loading manpower count:', countError)
      }
      
      if (dataError) {
        console.error('Error loading manpower data:', dataError)
      }

      const totalHours = (manpowerData || []).reduce((sum, record) => {
        const hours = parseFloat(String(record['Total Hours'] || 0)) || 0
        return sum + hours
      }, 0)
      
      const totalCost = (manpowerData || []).reduce((sum, record) => {
        const cost = parseFloat(String(record['Cost'] || 0)) || 0
        return sum + cost
      }, 0)

      setStats({
        totalBudget: 0, // TODO: Calculate from budget tables
        actualCost: totalCost,
        variance: 0 - totalCost,
        costPerformance: 0, // TODO: Calculate CPI
        manpowerRecords: manpowerCount || 0,
        totalHours,
        totalManpowerCost: totalCost
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `AED ${stats.totalBudget.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Cost</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `AED ${stats.actualCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <TrendingUp className={`h-4 w-4 ${stats.variance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {loading ? '...' : `AED ${stats.variance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Budget vs Actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `${stats.costPerformance.toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              CPI Index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MANPOWER Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MANPOWER Records</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.manpowerRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Hours worked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MANPOWER Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `AED ${stats.totalManpowerCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total manpower cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/cost-control?tab=manpower')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                MANPOWER
              </CardTitle>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Manage and track manpower costs, hours, and labor data across all projects
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {stats.manpowerRecords.toLocaleString()} records available
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push('/cost-control?tab=database')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                Database Manager
              </CardTitle>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Import, export, and manage all cost control data tables
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Manage MANPOWER and other tables
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for future sections */}
        <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
          <CardHeader>
            <CardTitle className="text-gray-400 dark:text-gray-500">More Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Additional cost control sections will be added here
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

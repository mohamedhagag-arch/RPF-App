'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { supabase, TABLES, AbsentCost, AttendanceEmployee, DesignationRate } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import {
  DollarSign,
  Search,
  RefreshCw,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Filter,
  Download,
  FileSpreadsheet
} from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { formatDate } from '@/lib/dateHelpers'

export default function AbsentCosts() {
  const { user, appUser } = useAuth()
  const [absentCosts, setAbsentCosts] = useState<AbsentCost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [statusFilter, setStatusFilter] = useState<'all' | 'absent' | 'excused_absent'>('all')
  const [selectedDesignation, setSelectedDesignation] = useState<string>('all')
  const [designations, setDesignations] = useState<string[]>([])

  useEffect(() => {
    loadAbsentCosts()
    
    // Auto-refresh when window gains focus (user switches back to tab)
    const handleFocus = () => {
      loadAbsentCosts()
    }
    
    window.addEventListener('focus', handleFocus)
    
    // Also refresh every 30 seconds when tab is active
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        loadAbsentCosts()
      }
    }, 30000)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])

  const loadAbsentCosts = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('🔄 Loading absent costs...')

      // Build query
      let query = supabase
        .from(TABLES.ABSENT_COSTS)
        // @ts-ignore
        .select(`
          *,
          employee:attendance_employees(*),
          designation_rate:designation_rates(*)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply filters
      if (dateFilter.start) {
        query = query.gte('date', dateFilter.start)
      }
      if (dateFilter.end) {
        query = query.lte('date', dateFilter.end)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (selectedDesignation !== 'all') {
        query = query.eq('designation', selectedDesignation)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Extract unique designations for filter
      const uniqueDesignations = Array.from(
        new Set(
          (data || [])
            .map((item: any) => item.designation)
            .filter((d: string) => d)
        )
      ).sort()

      setDesignations(uniqueDesignations)
      setAbsentCosts((data || []) as AbsentCost[])
      console.log(`✅ Loaded ${(data || []).length} absent cost records`)
    } catch (err: any) {
      console.error('❌ Error loading absent costs:', err)
      setError('Failed to load absent costs: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredCosts = useMemo(() => {
    return absentCosts.filter((cost) => {
      const matchesSearch =
        !searchTerm ||
        (cost.employee as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cost.employee as any)?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cost.designation?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })
  }, [absentCosts, searchTerm])

  const totalCost = useMemo(() => {
    return filteredCosts.reduce((sum, cost) => sum + (cost.cost || 0), 0)
  }, [filteredCosts])

  const handleExport = async () => {
    try {
      const exportData = filteredCosts.map((cost) => ({
        Date: cost.date,
        'Employee Code': (cost.employee as any)?.employee_code || '',
        'Employee Name': (cost.employee as any)?.name || '',
        Designation: cost.designation || '',
        Status: cost.status === 'absent' ? 'Absent' : 'Absent with Permission',
        'Overhead Hourly Rate': cost.overhead_hourly_rate,
        Hours: cost.hours,
        Cost: cost.cost,
        Notes: cost.notes || ''
      }))

      // Create CSV content
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header as keyof typeof row]
            return typeof value === 'string' && value.includes(',')
              ? `"${value}"`
              : value
          }).join(',')
        )
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `absent_costs_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setSuccess('Data exported successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error exporting data:', err)
      setError('Failed to export data: ' + err.message)
    }
  }

  if (loading && absentCosts.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-red-500" />
            Absent Costs
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track costs for absent and excused absent employees (8 hours × Overhead Hourly Rate)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAbsentCosts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {filteredCosts.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Employee name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="all">All Statuses</option>
                <option value="absent">Absent</option>
                <option value="excused_absent">Absent with Permission</option>
              </select>
            </div>
            {designations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Designation
                </label>
                <select
                  value={selectedDesignation}
                  onChange={(e) => setSelectedDesignation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="all">All Designations</option>
                  {designations.map((des) => (
                    <option key={des} value={des}>
                      {des}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={loadAbsentCosts} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            {(dateFilter.start || dateFilter.end || statusFilter !== 'all' || selectedDesignation !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter({ start: '', end: '' })
                  setStatusFilter('all')
                  setSelectedDesignation('all')
                  setSearchTerm('')
                }}
                size="sm"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCosts.length}</div>
            <p className="text-xs text-muted-foreground">Absent cost records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyByCodeSync(totalCost, 'AED')}</div>
            <p className="text-xs text-muted-foreground">Total absent costs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCosts.length > 0
                ? formatCurrencyByCodeSync(totalCost / filteredCosts.length, 'AED')
                : formatCurrencyByCodeSync(0, 'AED')}
            </div>
            <p className="text-xs text-muted-foreground">Per record</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Absent Costs Records</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No absent costs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">
                      Date
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">
                      Employee Code
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">
                      Employee Name
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">
                      Designation
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold">
                      Status
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">
                      Overhead Rate
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">
                      Hours
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">
                      Cost
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCosts.map((cost) => {
                    const employee = cost.employee as any as AttendanceEmployee
                    const statusLabel = cost.status === 'absent' ? 'Absent' : 'Absent with Permission'
                    const statusColor =
                      cost.status === 'absent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'

                    return (
                      <tr
                        key={cost.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                          {formatDate(cost.date)}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium">
                          {employee?.employee_code || '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                          {employee?.name || '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                          {cost.designation || '-'}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          {formatCurrencyByCodeSync(cost.overhead_hourly_rate, 'AED')}/hr
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          {cost.hours.toFixed(2)}h
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-bold">
                          {formatCurrencyByCodeSync(cost.cost, 'AED')}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {cost.notes || '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals Row */}
                  {filteredCosts.length > 0 && (
                    <tr className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <td
                        colSpan={7}
                        className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right"
                      >
                        Total:
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                        {formatCurrencyByCodeSync(totalCost, 'AED')}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

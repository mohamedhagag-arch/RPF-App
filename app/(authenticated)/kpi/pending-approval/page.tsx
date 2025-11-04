'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES, Project } from '@/lib/supabase'
import { mapProjectFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card } from '@/components/ui/Card'
import { ArrowLeft, CheckCircle, X, Clock, Target, AlertCircle } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface PendingKPI {
  id: string
  created_at: string
  // New snake_case fields (from mapKPIFromDB)
  project_full_code?: string
  project_code?: string
  activity_name?: string
  quantity?: number | string
  unit?: string
  target_date?: string
  section?: string
  zone?: string
  value?: number | string
  approval_status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approval_date?: string
  // Old fields with spaces (for backward compatibility)
  'Project Full Code'?: string
  'Project Code'?: string
  'Activity Name'?: string
  'Quantity'?: string
  'Unit'?: string
  'Target Date'?: string
  'Section'?: string
  'Zone'?: string
  'Value'?: string
  'Approval Status'?: string
  'Approved By'?: string
  'Approval Date'?: string
}

export default function PendingApprovalKPIPage() {
  const router = useRouter()
  const guard = usePermissionGuard()
  const [pendingKPIs, setPendingKPIs] = useState<PendingKPI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50) // 50 items per page
  
  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchPendingKPIs()
    fetchProjects()
  }, [])

  const fetchPendingKPIs = async () => {
    try {
      setLoading(true)
      setError('')

      // ✅ STRICT FILTER: Only show NEW Actual KPIs that need approval
      // Strategy: Only show KPIs that have NO approval status (null/empty)
      // This means they are NEW and haven't been processed yet
      // OLD KPIs would have been approved or processed already
      
      // Fetch ALL Actual KPIs (Supabase default limit is 1000, so we need pagination)
      // Fetch in chunks until we get all records
      let allData: any[] = []
      let offset = 0
      const chunkSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: chunkData, error: chunkError } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Input Type', 'Actual')
          .order('created_at', { ascending: false })
          .range(offset, offset + chunkSize - 1)
        
        if (chunkError) {
          throw chunkError
        }
        
        if (!chunkData || chunkData.length === 0) {
          hasMore = false
          break
        }
        
        allData = [...allData, ...chunkData]
        console.log(`📥 Fetched chunk: ${chunkData.length} KPIs (total so far: ${allData.length})`)
        
        // If we got less than chunkSize, we're done
        if (chunkData.length < chunkSize) {
          hasMore = false
        } else {
          offset += chunkSize
        }
      }
      
      const data = allData
      const totalFetched = (data || []).length
      console.log(`📥 Total Actual KPIs fetched: ${totalFetched}`)

      // Debug: Check first few KPIs to see what data we have
      if (data && data.length > 0) {
        const sample = data[0] as any
        console.log('🔍 Sample KPI data:', {
          id: sample.id,
          'Approval Status': sample['Approval Status'],
          'Notes': (sample['Notes'] || '').substring(0, 50),
          'Input Type': sample['Input Type'],
          'Activity Name': (sample['Activity Name'] || '').substring(0, 30)
        })
      }

      const mappedKPIs = (data || []).map(mapKPIFromDB).filter((kpi: any) => {
        // ✅ CLEAR FILTER RULE: Show ALL KPIs that DON'T have Approval Status = 'approved'
        // This includes: null, undefined, empty string, or any value other than 'approved'
        const rawRow = (data as any[])?.find((r: any) => r.id === kpi.id)
        if (!rawRow) {
          console.warn(`⚠️ Could not find raw row for KPI ${kpi.id}`)
          return false
        }
        
        // Check Approval Status column
        // If column doesn't exist, dbApprovalStatus will be undefined
        const dbApprovalStatus = rawRow['Approval Status']
        
        // Normalize approval status string
        let approvalStatusStr = ''
        if (dbApprovalStatus !== null && dbApprovalStatus !== undefined && dbApprovalStatus !== '') {
          approvalStatusStr = String(dbApprovalStatus).toLowerCase().trim()
        }
        // If approvalStatusStr is still empty, it means null/undefined/empty - needs approval
        
        // Check Notes field for approval status (fallback)
        const notes = rawRow['Notes'] || ''
        const notesStr = String(notes)
        const notesHasApproved = notesStr.includes('APPROVED:') && notesStr.includes(':approved:')
        
        // ✅ INCLUDE if:
        //   1. Approval Status is null/undefined/empty (needs approval)
        //   2. Approval Status exists but is NOT 'approved' (needs approval)
        //   3. Notes does NOT contain 'APPROVED:approved:' (needs approval)
        
        // ✅ EXCLUDE only if:
        //   1. Approval Status === 'approved' (already approved)
        //   2. OR Notes contains 'APPROVED:approved:' (already approved via Notes)
        
        const isExplicitlyApproved = (
          approvalStatusStr === 'approved' || 
          notesHasApproved
        )
        
        if (isExplicitlyApproved) {
          return false // Exclude - explicitly approved
        }
        
        // ✅ INCLUDE - This KPI needs approval
        // (Approval Status is null/undefined/empty OR not 'approved', 
        //  AND Notes doesn't contain approval marker)
        return true
      })

      console.log(`✅ Filtered KPIs: Found ${mappedKPIs.length} KPIs that need approval (out of ${totalFetched} total)`)
      console.log(`📊 Excluded: ${totalFetched - mappedKPIs.length} KPIs (already approved)`)
      
      // Debug: Show detailed breakdown
      if (totalFetched > 0) {
        const approvalBreakdown = {
          hasApprovalStatusApproved: 0,
          hasApprovalStatusOther: 0,
          hasApprovalNotes: 0,
          noApprovalAtAll: 0,
          total: totalFetched
        }
        ;(data || []).forEach((row: any) => {
          const approvalStatus = row['Approval Status']
          const notes = row['Notes'] || ''
          const notesStr = String(notes)
          const hasNotesApproval = notesStr.includes('APPROVED:') && notesStr.includes(':approved:')
          
          if (approvalStatus && String(approvalStatus).toLowerCase().trim() === 'approved') {
            approvalBreakdown.hasApprovalStatusApproved++
          } else if (approvalStatus !== null && approvalStatus !== undefined && approvalStatus !== '') {
            approvalBreakdown.hasApprovalStatusOther++
          } else if (hasNotesApproval) {
            approvalBreakdown.hasApprovalNotes++
          } else {
            approvalBreakdown.noApprovalAtAll++
          }
        })
        console.log('📊 Approval Status Breakdown:', approvalBreakdown)
        console.log(`   ✅ Should show: ${approvalBreakdown.noApprovalAtAll + approvalBreakdown.hasApprovalStatusOther} KPIs (no approval or other status)`)
        console.log(`   ❌ Will hide: ${approvalBreakdown.hasApprovalStatusApproved + approvalBreakdown.hasApprovalNotes} KPIs (already approved)`)
      }

      setPendingKPIs(mappedKPIs as PendingKPI[])
      setCurrentPage(1) // Reset to first page when data changes
    } catch (err: any) {
      console.error('Error fetching pending KPIs:', err)
      setError(err.message || 'Failed to load pending KPIs')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      const mappedProjects = (data || []).map(mapProjectFromDB)
      setProjects(mappedProjects)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
    }
  }

  const handleApprove = async (kpiId: string) => {
    if (processingIds.has(kpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(kpiId))
      setError('')
      setSuccess('')

      // Update using Notes field as temporary storage for approval status
      // Format: "APPROVED:approved:by:user@email.com:date:2025-01-01"
      // This works even if Approval Status column doesn't exist yet
      const approvalNote = `APPROVED:approved:by:${guard.user?.email || 'admin'}:date:${new Date().toISOString().split('T')[0]}`
      
        // Try to update Approval Status first (if column exists)
        // Note: Use bracket notation for column name with space
        let updateError = null
        try {
          const updatePayload: any = {}
          updatePayload['Approval Status'] = 'approved'
          
          const { error: statusError } = await (supabase
            .from(TABLES.KPI) as any)
            .update(updatePayload)
            .eq('id', kpiId)
        
        updateError = statusError
        
        // If Approval Status column doesn't exist, update Notes instead
        if (statusError && (statusError.message?.includes('Approval Status') || statusError.message?.includes('column') || statusError.message?.includes('does not exist'))) {
          console.log('⚠️ Approval Status column not found, using Notes field instead')
          const { error: notesError } = await (supabase
            .from(TABLES.KPI) as any)
            .update({
              'Notes': approvalNote
            })
            .eq('id', kpiId)
          
          updateError = notesError
        }
      } catch (e: any) {
        // Fallback to Notes if update fails
        console.log('⚠️ Using Notes field as fallback:', e.message || e)
        try {
          const { error: notesError } = await (supabase
            .from(TABLES.KPI) as any)
            .update({
              'Notes': approvalNote
            })
            .eq('id', kpiId)
          
          updateError = notesError
        } catch (notesErr: any) {
          console.error('Error updating Notes:', notesErr)
          updateError = notesErr
        }
      }

      if (updateError) {
        console.error('Error updating Approval Status:', updateError)
        throw updateError
      }

      setSuccess(`KPI approved successfully!`)
      
      // Remove from list
      setPendingKPIs(prev => prev.filter(kpi => kpi.id !== kpiId))
      
      // Refresh list after short delay
      setTimeout(() => {
        fetchPendingKPIs()
      }, 1000)

    } catch (err: any) {
      console.error('Error approving KPI:', err)
      setError(err.message || 'Failed to approve KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(kpiId)
        return newSet
      })
    }
  }

  const handleReject = async (kpiId: string) => {
    if (processingIds.has(kpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(kpiId))
      setError('')
      setSuccess('')

      // Update using Notes field as temporary storage for approval status
      const rejectionNote = `APPROVED:rejected:by:${guard.user?.email || 'admin'}:date:${new Date().toISOString().split('T')[0]}`
      
      // Try to update Approval Status first (if column exists)
      // Note: Use bracket notation for column name with space
      let updateError = null
      try {
        const updatePayload: any = {}
        updatePayload['Approval Status'] = 'rejected'
        
        const { error: statusError } = await (supabase
          .from(TABLES.KPI) as any)
          .update(updatePayload)
          .eq('id', kpiId)
        
        updateError = statusError
        
        // If Approval Status column doesn't exist, update Notes instead
        if (statusError && (statusError.message?.includes('Approval Status') || statusError.message?.includes('column') || statusError.message?.includes('does not exist'))) {
          console.log('⚠️ Approval Status column not found, using Notes field instead')
          const { error: notesError } = await (supabase
            .from(TABLES.KPI) as any)
            .update({
              'Notes': rejectionNote
            })
            .eq('id', kpiId)
          
          updateError = notesError
        }
      } catch (e: any) {
        // Fallback to Notes if update fails
        console.log('⚠️ Using Notes field as fallback:', e.message || e)
        try {
          const { error: notesError } = await (supabase
            .from(TABLES.KPI) as any)
            .update({
              'Notes': rejectionNote
            })
            .eq('id', kpiId)
          
          updateError = notesError
        } catch (notesErr: any) {
          console.error('Error updating Notes:', notesErr)
          updateError = notesErr
        }
      }

      if (updateError) {
        console.error('Error updating Approval Status:', updateError)
        throw updateError
      }

      setSuccess(`KPI rejected successfully!`)
      
      // Remove from list
      setPendingKPIs(prev => prev.filter(kpi => kpi.id !== kpiId))
      
      // Refresh list after short delay
      setTimeout(() => {
        fetchPendingKPIs()
      }, 1000)

    } catch (err: any) {
      console.error('Error rejecting KPI:', err)
      setError(err.message || 'Failed to reject KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(kpiId)
        return newSet
      })
    }
  }

  const handleBulkApprove = async () => {
    if (pendingKPIs.length === 0) return

    // Get count of all pending KPIs (not just displayed)
    const { count: totalPendingCount } = await supabase
      .from(TABLES.KPI)
      .select('*', { count: 'exact', head: true })
      .eq('Input Type', 'Actual')
    
    const confirmMessage = totalPendingCount && totalPendingCount > pendingKPIs.length
      ? `Are you sure you want to approve ALL ${totalPendingCount} pending Actual KPIs? (Currently showing ${pendingKPIs.length})`
      : `Are you sure you want to approve all ${pendingKPIs.length} pending KPIs?`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // ✅ EFFICIENT BULK APPROVE: Process all Actual KPIs in chunks
      // This approach fetches and updates in chunks to handle large datasets
      console.log('🚀 Starting bulk approve for ALL Actual KPIs without approval status...')
      
      const fetchChunkSize = 1000 // Fetch 1000 at a time
      const updateChunkSize = 50 // Update 50 at a time (smaller batches for updates)
      let offset = 0
      let totalApproved = 0
      let hasMore = true
      const approvalNote = `APPROVED:approved:by:${guard.user?.email || 'admin'}:date:${new Date().toISOString().split('T')[0]}`
      
      // Process in chunks until no more records
      while (hasMore) {
        // Fetch chunk of Actual KPIs that need approval
        // Use select('*') to get all columns including Approval Status if it exists
        const { data: chunkData, error: chunkError } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Input Type', 'Actual')
          .range(offset, offset + fetchChunkSize - 1)
        
        if (chunkError) {
          console.error(`Error fetching chunk at offset ${offset}:`, chunkError)
          throw chunkError
        }
        
        if (!chunkData || chunkData.length === 0) {
          hasMore = false
          break
        }
        
        // Filter to only those that need approval (no approval status)
        const idsToApprove = chunkData
          .filter((row: any) => {
            const approvalStatus = row['Approval Status'] || null
            const notes = row['Notes'] || ''
            const hasApproval = approvalStatus || (notes && String(notes).includes('APPROVED:'))
            return !hasApproval // Include if no approval status
          })
          .map((row: any) => row.id)
        
        // Process updates in smaller batches to avoid "Bad Request" errors
        if (idsToApprove.length > 0) {
          for (let i = 0; i < idsToApprove.length; i += updateChunkSize) {
            const batchIds = idsToApprove.slice(i, i + updateChunkSize)
            
            // Try to update using Approval Status column first
            let batchError = null
            try {
              // Use bracket notation for column name with space
              const updatePayload: any = {}
              updatePayload['Approval Status'] = 'approved'
              
              const { error: statusError } = await (supabase
                .from(TABLES.KPI) as any)
                .update(updatePayload)
                .in('id', batchIds)
              
              batchError = statusError
              
              // If Approval Status column doesn't exist, use Notes field
              if (statusError && (statusError.message?.includes('Approval Status') || statusError.message?.includes('column') || statusError.message?.includes('does not exist'))) {
                console.log(`⚠️ Approval Status column not found for batch ${i}, using Notes field instead`)
                const { error: notesError } = await (supabase
                  .from(TABLES.KPI) as any)
                  .update({
                    'Notes': approvalNote
                  })
                  .in('id', batchIds)
                
                batchError = notesError
              }
            } catch (e: any) {
              // Fallback to Notes if update fails
              console.log(`⚠️ Using Notes field as fallback for batch ${i}:`, e.message || e)
              try {
                const { error: notesError } = await (supabase
                  .from(TABLES.KPI) as any)
                  .update({
                    'Notes': approvalNote
                  })
                  .in('id', batchIds)
                
                batchError = notesError
              } catch (notesErr: any) {
                console.error(`Error updating Notes for batch ${i}:`, notesErr)
                batchError = notesErr
              }
            }
            
            if (batchError) {
              console.error(`Error updating batch ${i} at offset ${offset}:`, batchError)
              // Continue to next batch instead of throwing
            } else {
              totalApproved += batchIds.length
              console.log(`✅ Approved ${batchIds.length} KPIs in batch ${i} (total: ${totalApproved})`)
              // Update progress message
              setSuccess(`Processing... Approved ${totalApproved} KPIs so far...`)
            }
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Check if we've processed all records
        if (chunkData.length < fetchChunkSize) {
          hasMore = false
        } else {
          offset += fetchChunkSize
        }
      }
      
      if (totalApproved > 0) {
        setSuccess(`Successfully approved ${totalApproved} Actual KPIs!`)
      } else {
        setError('No KPIs were found that need approval')
      }
      
      // Refresh the list
      setTimeout(() => {
        fetchPendingKPIs()
      }, 1000)

    } catch (err: any) {
      console.error('Error bulk approving KPIs:', err)
      setError(err.message || 'Failed to approve KPIs')
    } finally {
      setLoading(false)
    }
  }

  const getProjectName = (projectCode: string) => {
    if (!projectCode) return 'N/A'
    const project = projects.find(p => p.project_code === projectCode || p.project_code === projectCode.trim())
    return project?.project_name || projectCode || 'N/A'
  }
  
  // Helper to get field value (handles both old and new field names)
  const getField = (kpi: PendingKPI, field: string): any => {
    // Try new snake_case first
    const snakeCase = field.toLowerCase().replace(/\s+/g, '_')
    if (snakeCase in kpi) {
      return (kpi as any)[snakeCase]
    }
    // Try old camelCase with spaces
    if (field in kpi) {
      return (kpi as any)[field]
    }
    // Try common variations
    if (field === 'Project Code') {
      return kpi.project_code || kpi['Project Code'] || ''
    }
    if (field === 'Activity Name') {
      return kpi.activity_name || kpi['Activity Name'] || ''
    }
    if (field === 'Quantity') {
      return kpi.quantity || kpi['Quantity'] || '0'
    }
    if (field === 'Target Date') {
      return kpi.target_date || kpi['Target Date'] || ''
    }
    if (field === 'Value') {
      return kpi.value || kpi['Value'] || '0'
    }
    if (field === 'Unit') {
      return kpi.unit || kpi['Unit'] || ''
    }
    return ''
  }

  if (loading && pendingKPIs.length === 0) {
    return (
      <PermissionPage 
        permission="kpi.need_to_submit"
        accessDeniedTitle="Access Required"
        accessDeniedMessage="You need permission to view KPIs pending submission. Please contact your administrator."
      >
        <DynamicTitle pageTitle="Pending Approval KPIs" />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading pending KPIs...</p>
          </div>
        </div>
      </PermissionPage>
    )
  }

  return (
    <PermissionPage 
      permission="kpi.need_to_submit"
      accessDeniedTitle="Access Required"
      accessDeniedMessage="You need permission to view KPIs pending submission. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Pending Approval KPIs" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="w-full mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/kpi')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to KPI
                </Button>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Need to Submit / Pending Approval
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Review and approve Actual KPIs added by engineers
                  </p>
                </div>
              </div>

              {pendingKPIs.length > 0 && guard.hasAccess('kpi.approve') && (
                <Button
                  onClick={handleBulkApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All ({pendingKPIs.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="w-full mx-auto px-4 sm:px-6 py-6">
          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
              <Button variant="ghost" size="sm" onClick={() => setError('')} className="ml-2">
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              {success}
              <Button variant="ghost" size="sm" onClick={() => setSuccess('')} className="ml-2">
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Summary Card */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {pendingKPIs.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Pending KPIs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Pagination Controls - Top */}
          {pendingKPIs.length > itemsPerPage && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pendingKPIs.length)} of {pendingKPIs.length} KPIs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(pendingKPIs.length / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(pendingKPIs.length / itemsPerPage)
                    let pageNum: number
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(pendingKPIs.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(pendingKPIs.length / itemsPerPage)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(pendingKPIs.length / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(pendingKPIs.length / itemsPerPage)}
                >
                  Last
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          )}

          {/* KPIs List */}
          {pendingKPIs.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Pending KPIs
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All Actual KPIs have been approved or there are no pending approvals.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Calculate pagination
                const startIndex = (currentPage - 1) * itemsPerPage
                const endIndex = startIndex + itemsPerPage
                const paginatedKPIs = pendingKPIs.slice(startIndex, endIndex)
                
                return paginatedKPIs.map((kpi) => (
                <Card key={kpi.id} className="hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {getField(kpi, 'Activity Name') || 'N/A'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Project: {getProjectName(getField(kpi, 'Project Code') || '')} ({getField(kpi, 'Project Code') || 'N/A'})
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {getField(kpi, 'Quantity') || '0'} {getField(kpi, 'Unit') || ''}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Date</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const targetDate = getField(kpi, 'Target Date')
                                if (!targetDate || targetDate === '' || targetDate === 'N/A') return 'N/A'
                                try {
                                  return new Date(targetDate).toLocaleDateString()
                                } catch {
                                  return targetDate || 'N/A'
                                }
                              })()}
                            </div>
                          </div>
                          {(() => {
                            const value = getField(kpi, 'Value')
                            const numValue = parseFloat(String(value || '0'))
                            return numValue > 0 ? (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Value</div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  ${numValue.toLocaleString()}
                                </div>
                              </div>
                            ) : null
                          })()}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {(() => {
                                try {
                                  return kpi.created_at ? new Date(kpi.created_at).toLocaleDateString() : 'N/A'
                                } catch {
                                  return 'N/A'
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <PermissionButton
                          permission="kpi.approve"
                          onClick={() => handleApprove(kpi.id)}
                          disabled={processingIds.has(kpi.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {processingIds.has(kpi.id) ? (
                            <>
                              <LoadingSpinner size="sm" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </>
                          )}
                        </PermissionButton>
                        <PermissionButton
                          permission="kpi.approve"
                          onClick={() => handleReject(kpi.id)}
                          disabled={processingIds.has(kpi.id)}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </PermissionButton>
                      </div>
                    </div>
                  </div>
                </Card>
                ))
              })()}
            </div>
          )}

          {/* Pagination Controls - Bottom */}
          {pendingKPIs.length > itemsPerPage && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pendingKPIs.length)} of {pendingKPIs.length} KPIs
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(pendingKPIs.length / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(pendingKPIs.length / itemsPerPage)
                    let pageNum: number
                    
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(pendingKPIs.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(pendingKPIs.length / itemsPerPage)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(pendingKPIs.length / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(pendingKPIs.length / itemsPerPage)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionPage>
  )
}


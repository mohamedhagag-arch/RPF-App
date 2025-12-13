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
import { ArrowLeft, CheckCircle, X, Clock, Target, AlertCircle, User, Mail, Phone, Filter, Search, MessageCircle, Edit, Save, RotateCcw, Trash2, CheckSquare, Square } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'

interface PendingKPI {
  id: string
  created_at: string
  created_by?: string // ✅ Creator identifier (email or user ID)
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
  'Recorded By'?: string // Alternative field name for created_by
}

interface UserInfo {
  name: string
  email: string
  phone_1?: string
  phone_2?: string
  role?: string
  division?: string
}

export default function PendingApprovalKPIPage() {
  const router = useRouter()
  const guard = usePermissionGuard()
  const { user: authUser, appUser } = useAuth()
  const [pendingKPIs, setPendingKPIs] = useState<PendingKPI[]>([])
  const [filteredKPIs, setFilteredKPIs] = useState<PendingKPI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  
  // ✅ Filter state
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [activitySearchTerm, setActivitySearchTerm] = useState('')
  const [zoneSearchTerm, setZoneSearchTerm] = useState('')
  
  // ✅ User info cache (for creator information)
  const [userInfoCache, setUserInfoCache] = useState<Map<string, UserInfo>>(new Map())
  
  // ✅ Edit KPI state
  const [editingKPI, setEditingKPI] = useState<PendingKPI | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [rejectingKPIId, setRejectingKPIId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  
  // ✅ Tab state
  const [activeTab, setActiveTab] = useState<'pending' | 'rejected'>('pending')
  
  // ✅ Rejected KPIs state
  const [rejectedKPIs, setRejectedKPIs] = useState<PendingKPI[]>([])
  const [filteredRejectedKPIs, setFilteredRejectedKPIs] = useState<PendingKPI[]>([])
  const [loadingRejected, setLoadingRejected] = useState(false)
  
  // ✅ Selection state
  const [selectedPendingKPIs, setSelectedPendingKPIs] = useState<Set<string>>(new Set())
  const [selectedRejectedKPIs, setSelectedRejectedKPIs] = useState<Set<string>>(new Set())
  
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
      
      // ✅ Load user info for all creators
      const creatorIds = Array.from(new Set((data as any[])
        .map((row: any) => row.created_by || row['created_by'] || row['Recorded By'] || null)
        .filter(Boolean)))
      
      if (creatorIds.length > 0) {
        await loadUserInfo(creatorIds as string[])
      }
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

  const fetchRejectedKPIs = async () => {
    try {
      setLoadingRejected(true)
      setError('')

      // Fetch rejected KPIs from kpi_rejected table
      let allData: any[] = []
      let offset = 0
      const chunkSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: chunkData, error: chunkError } = await supabase
          .from(TABLES.KPI_REJECTED)
          .select('*')
          .order('Rejected Date', { ascending: false })
          .range(offset, offset + chunkSize - 1)
        
        if (chunkError) {
          throw chunkError
        }
        
        if (!chunkData || chunkData.length === 0) {
          hasMore = false
          break
        }
        
        allData = [...allData, ...chunkData]
        
        if (chunkData.length < chunkSize) {
          hasMore = false
        } else {
          offset += chunkSize
        }
      }
      
      const mappedKPIs = (allData || []).map(mapKPIFromDB)
      setRejectedKPIs(mappedKPIs as PendingKPI[])
      setFilteredRejectedKPIs(mappedKPIs as PendingKPI[])
      
      // Load user info for creators
      const creatorIds = Array.from(new Set((allData as any[])
        .map((row: any) => row.created_by || row['created_by'] || row['Recorded By'] || null)
        .filter(Boolean)))
      
      if (creatorIds.length > 0) {
        await loadUserInfo(creatorIds as string[])
      }
    } catch (err: any) {
      console.error('Error fetching rejected KPIs:', err)
      setError(err.message || 'Failed to load rejected KPIs')
    } finally {
      setLoadingRejected(false)
    }
  }

  const handleEdit = (kpi: PendingKPI) => {
    setEditingKPI(kpi)
    setShowEditModal(true)
  }

  const handleSaveEdit = async (editedKPI: PendingKPI) => {
    if (!editedKPI || !editedKPI.id) return

    try {
      setError('')
      setSuccess('')

      // ✅ Check if this is a rejected KPI or pending KPI
      const isRejected = activeTab === 'rejected' || rejectedKPIs.some(k => k.id === editedKPI.id)

      // ✅ Prepare update payload with edited fields
      const updatePayload: any = {}
      
      // Update all editable fields
      if (editedKPI.project_full_code !== undefined) updatePayload['Project Full Code'] = editedKPI.project_full_code
      if (editedKPI.project_code !== undefined) updatePayload['Project Code'] = editedKPI.project_code
      if (editedKPI.activity_name !== undefined) updatePayload['Activity Name'] = editedKPI.activity_name
      if (editedKPI.quantity !== undefined) updatePayload['Quantity'] = String(editedKPI.quantity)
      if (editedKPI.unit !== undefined) updatePayload['Unit'] = editedKPI.unit
      if (editedKPI.target_date !== undefined) updatePayload['Target Date'] = editedKPI.target_date
      if (editedKPI.section !== undefined) updatePayload['Section'] = editedKPI.section
      if (editedKPI.zone !== undefined) updatePayload['Zone'] = editedKPI.zone
      if (editedKPI.value !== undefined) updatePayload['Value'] = String(editedKPI.value)

      if (isRejected) {
        // Update rejected KPI
        const { error: updateError } = await (supabase
          .from(TABLES.KPI_REJECTED) as any)
          .update(updatePayload)
          .eq('id', editedKPI.id)

        if (updateError) {
          throw updateError
        }

        setSuccess('Rejected KPI updated successfully!')
        
        // Refresh rejected list
        setTimeout(() => {
          fetchRejectedKPIs()
        }, 500)
      } else {
        // Update pending KPI
        const { error: updateError } = await (supabase
          .from(TABLES.KPI) as any)
          .update(updatePayload)
          .eq('id', editedKPI.id)

        if (updateError) {
          throw updateError
        }

        setSuccess('KPI updated successfully!')
        
        // Refresh pending list
        setTimeout(() => {
          fetchPendingKPIs()
        }, 500)
      }

      setShowEditModal(false)
      setEditingKPI(null)

    } catch (err: any) {
      console.error('Error updating KPI:', err)
      setError(err.message || 'Failed to update KPI')
    }
  }

  const handleApprove = async (kpiId: string, editedData?: Partial<PendingKPI>, isRejected: boolean = false) => {
    if (processingIds.has(kpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(kpiId))
      setError('')
      setSuccess('')

      // ✅ If edited data is provided, update the KPI first
      if (editedData && Object.keys(editedData).length > 0) {
        const updatePayload: any = {}
        
        if (editedData.project_full_code !== undefined) updatePayload['Project Full Code'] = editedData.project_full_code
        if (editedData.project_code !== undefined) updatePayload['Project Code'] = editedData.project_code
        if (editedData.activity_name !== undefined) updatePayload['Activity Name'] = editedData.activity_name
        if (editedData.quantity !== undefined) updatePayload['Quantity'] = String(editedData.quantity)
        if (editedData.unit !== undefined) updatePayload['Unit'] = editedData.unit
        if (editedData.target_date !== undefined) updatePayload['Target Date'] = editedData.target_date
        if (editedData.section !== undefined) updatePayload['Section'] = editedData.section
        if (editedData.zone !== undefined) updatePayload['Zone'] = editedData.zone
        if (editedData.value !== undefined) updatePayload['Value'] = String(editedData.value)

        const { error: updateError } = await (supabase
          .from(TABLES.KPI) as any)
          .update(updatePayload)
          .eq('id', kpiId)

        if (updateError) {
          throw updateError
        }
      }

      // ✅ Get user identifier (priority: email > appUser email > auth user email > user ID > 'admin')
      const userEmail = appUser?.email || authUser?.email || guard.user?.email || null
      const userId = authUser?.id || appUser?.id || guard.user?.id || null
      const approvedByValue = userEmail || userId || 'admin'
      
      // Update using Notes field as temporary storage for approval status
      // Format: "APPROVED:approved:by:user@email.com:date:2025-01-01"
      // This works even if Approval Status column doesn't exist yet
      const approvalNote = `APPROVED:approved:by:${approvedByValue}:date:${new Date().toISOString().split('T')[0]}`
      
        // Try to update Approval Status first (if column exists)
        // Note: Use bracket notation for column name with space
        let updateError = null
        try {
          const updatePayload: any = {}
          updatePayload['Approval Status'] = 'approved'
          updatePayload['Approved By'] = approvedByValue
          updatePayload['Approval Date'] = new Date().toISOString().split('T')[0]
          
          console.log('✅ [KPI Approval] Updating KPI with:', {
            kpiId,
            updatePayload,
            userEmail,
            userId,
            approvedByValue,
            authUserEmail: authUser?.email,
            appUserEmail: appUser?.email,
            guardUserEmail: guard.user?.email
          })
          
          const { error: statusError, data: updateData } = await (supabase
            .from(TABLES.KPI) as any)
            .update(updatePayload)
            .eq('id', kpiId)
            .select()
        
        updateError = statusError
        
        if (!statusError && updateData) {
          console.log('✅ [KPI Approval] Update successful:', {
            kpiId,
            updatedRecord: updateData[0],
            approvalStatus: updateData[0]?.['Approval Status'],
            approvedBy: updateData[0]?.['Approved By'],
            approvalDate: updateData[0]?.['Approval Date'],
            rawData: updateData[0]
          })
          
          // ✅ VERIFY: Double-check that the data was actually saved
          const { data: verifyData, error: verifyError } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('id', kpiId)
            .single()
          
          if (!verifyError && verifyData) {
            console.log('🔍 [KPI Approval] Verification - Data in database:', {
              approvalStatus: verifyData['Approval Status'],
              approvedBy: verifyData['Approved By'],
              approvalDate: verifyData['Approval Date'],
              notes: verifyData['Notes']
            })
          } else {
            console.error('❌ [KPI Approval] Verification failed:', verifyError)
          }
        } else if (statusError) {
          console.error('❌ [KPI Approval] Update error:', statusError)
        }
        
        // If Approval Status column doesn't exist, update Notes instead
        if (statusError && (statusError.message?.includes('Approval Status') || statusError.message?.includes('column') || statusError.message?.includes('does not exist') || statusError.message?.includes('not found'))) {
          console.log('⚠️ Approval Status column not found, using Notes field instead')
          // Try to update Notes with approval info AND also try to update individual columns if they exist
          const notesUpdatePayload: any = {
            'Notes': approvalNote
          }
          
          // Try to update Approved By and Approval Date separately (they might exist even if Approval Status doesn't)
          try {
            const { error: approvedByError } = await (supabase
              .from(TABLES.KPI) as any)
              .update({ 'Approved By': approvedByValue })
              .eq('id', kpiId)
            
            if (!approvedByError) {
              console.log('✅ Updated Approved By column')
            }
          } catch (e) {
            console.log('⚠️ Approved By column not found, will use Notes only')
          }
          
          try {
            const { error: approvalDateError } = await (supabase
              .from(TABLES.KPI) as any)
              .update({ 'Approval Date': new Date().toISOString().split('T')[0] })
              .eq('id', kpiId)
            
            if (!approvalDateError) {
              console.log('✅ Updated Approval Date column')
            }
          } catch (e) {
            console.log('⚠️ Approval Date column not found, will use Notes only')
          }
          
          const { error: notesError } = await (supabase
            .from(TABLES.KPI) as any)
            .update(notesUpdatePayload)
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

  const handleRejectClick = (kpiId: string) => {
    setRejectingKPIId(kpiId)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async (kpiId: string, rejectionReason?: string) => {
    if (processingIds.has(kpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(kpiId))
      setError('')
      setSuccess('')

      // ✅ Get user identifier (priority: email > appUser email > auth user email > user ID > 'admin')
      const userEmail = appUser?.email || authUser?.email || guard.user?.email || null
      const userId = authUser?.id || appUser?.id || guard.user?.id || null
      const rejectedByValue = userEmail || userId || 'admin'
      
      // ✅ Step 1: Fetch the KPI data from the main table
      const { data: kpiData, error: fetchError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .eq('id', kpiId)
        .single()

      if (fetchError || !kpiData) {
        throw new Error(fetchError?.message || 'Failed to fetch KPI data')
      }

      // ✅ Step 2: Prepare data for rejected table (copy all fields)
      // Convert kpiData to a plain object to avoid TypeScript spread issues
      const kpiDataObj = kpiData as Record<string, any>
      
      // ✅ Preserve the original created_by from the main KPI table
      // This is critical - we want to maintain who originally created the KPI
      const originalCreatedBy = kpiDataObj['created_by'] || kpiDataObj.created_by || null
      const originalUpdatedBy = kpiDataObj['updated_by'] || kpiDataObj.updated_by || null
      
      const rejectedData: any = {
        ...kpiDataObj,
        'Original KPI ID': kpiId,
        'Rejection Reason': rejectionReason || 'No reason provided',
        'Rejected By': rejectedByValue,
        'Rejected Date': new Date().toISOString()
      }

      // Remove the id field so a new UUID is generated
      delete rejectedData.id
      
      // ✅ Explicitly preserve created_by and updated_by from original KPI
      // This ensures the original creator information is maintained
      // The database trigger will respect these values if we set them explicitly
      if (originalCreatedBy && originalCreatedBy !== 'System') {
        rejectedData['created_by'] = originalCreatedBy
        rejectedData.created_by = originalCreatedBy // Support both formats
        console.log('✅ Preserving original created_by from KPI:', originalCreatedBy)
      }
      
      if (originalUpdatedBy && originalUpdatedBy !== 'System') {
        rejectedData['updated_by'] = originalUpdatedBy
        rejectedData.updated_by = originalUpdatedBy // Support both formats
      }

      // ✅ Step 3: Insert into rejected table
      const { error: insertError } = await supabase
        .from(TABLES.KPI_REJECTED)
        .insert(rejectedData)

      if (insertError) {
        console.error('Error inserting into rejected table:', insertError)
        throw insertError
      }

      // ✅ Step 4: Delete from main KPI table (to keep it separate)
      const { error: deleteError } = await supabase
        .from(TABLES.KPI)
        .delete()
        .eq('id', kpiId)

      if (deleteError) {
        console.error('Error deleting from main table:', deleteError)
        // Don't throw - the data is already in rejected table
        // Just log the error
      }

      setSuccess(`KPI rejected and moved to rejected table successfully!`)
      
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

  // ✅ Restore rejected KPI (move back to main table)
  const handleRestoreRejected = async (rejectedKpiId: string) => {
    if (processingIds.has(rejectedKpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(rejectedKpiId))
      setError('')
      setSuccess('')

      // ✅ Step 1: Fetch the rejected KPI data
      const { data: rejectedData, error: fetchError } = await supabase
        .from(TABLES.KPI_REJECTED)
        .select('*')
        .eq('id', rejectedKpiId)
        .single()

      if (fetchError || !rejectedData) {
        throw new Error(fetchError?.message || 'Failed to fetch rejected KPI data')
      }

      // ✅ Step 2: Prepare data for main table (preserve ALL data except rejection-specific and invalid columns)
      const kpiDataObj = rejectedData as Record<string, any>
      
      // ✅ Copy ALL data first (preserve everything)
      const mainTableData: any = { ...kpiDataObj }
      
      // ✅ Remove rejection-specific fields only
      delete mainTableData['Rejection Reason']
      delete mainTableData['Rejected By']
      delete mainTableData['Rejected Date']
      delete mainTableData['Original KPI ID']
      delete mainTableData.id // Generate new ID
      
      // ✅ Remove ONLY columns that definitely don't exist in main KPI table
      // COMPREHENSIVE LIST: All columns that exist in kpi_rejected but NOT in "Planning Database - KPI"
      // Based on PRODUCTION_SCHEMA_COMPLETE.sql - the actual KPI table only has these columns:
      // id, Project Full Code, Project Code, Project Sub Code, Activity Name, Activity, Input Type,
      // Quantity, Unit, Section, Zone, Drilled Meters, Value, Target Date, Actual Date, Activity Date,
      // Day, Recorded By, Notes, created_at, updated_at
      // Plus potentially: Activity Timing, Approval Status, Approved By, Approval Date (from migrations)
      const invalidColumns = [
        // ============================================================
        // REJECTION-SPECIFIC FIELDS (must be removed)
        // ============================================================
        'Rejection Reason',
        'Rejected By',
        'Rejected Date',
        'Original KPI ID',
        
        // ============================================================
        // METADATA FIELDS (rejected table specific)
        // ============================================================
        // Note: created_by and updated_by are PRESERVED - they exist in main KPI table
        // Only remove them if they cause errors (they shouldn't)
        
        // ============================================================
        // BOQ-SPECIFIC CALCULATED FIELDS (not in main KPI table)
        // ============================================================
        'Activity Actual Status',
        'Activity Planned Status',
        'Activity Planned Start Date',
        'Activity Planned Completion Date',
        'Activity Delayed?',
        'Activity On Track?',
        'Activity Completed',
        'Activity Scope',                    // ❌ NOT in main KPI table
        'Remaining Work Value',
        'Variance Works Value',
        'LookAhead Start Date',
        'LookAhead Activity Completion Date',
        'Remaining LookAhead Duration For Activity Completion',
        
        // ============================================================
        // CALCULATED/PROGRESS FIELDS (NOT in actual database)
        // ============================================================
        'Activity Progress %',               // ❌ NOT in actual database
        'Planned Value',                     // ❌ NOT in actual database
        'Earned Value',                      // ❌ NOT in actual database
        'Delay %',                           // ❌ NOT in actual database
        'Planned Progress %',                // ❌ NOT in actual database
        'Drilled Meters Planned Progress',   // ❌ NOT in actual database
        'Drilled Meters Actual Progress',    // ❌ NOT in actual database
        'Remaining Meters',                  // ❌ NOT in actual database
        'Variance Units',                    // ❌ NOT in actual database
        'Diffrence',                         // ❌ NOT in actual database
        'Total Units',                       // ❌ NOT in actual database
        'Planned Units',                     // ❌ NOT in actual database
        'Actual Units',                      // ❌ NOT in actual database
        'Total Value',                       // ❌ NOT in actual database
        'Productivity Daily Rate',           // ❌ NOT in actual database
        'Total Drilling Meters',             // ❌ NOT in actual database
        'Planned Activity Start Date',       // ❌ NOT in actual database
        'Deadline',                          // ❌ NOT in actual database
        'Calendar Duration',                 // ❌ NOT in actual database
        'Reported on Data Date?',            // ❌ NOT in actual database
        
        // ============================================================
        // COLUMNS ADDED TO REJECTED TABLE (definitely NOT in main KPI)
        // ============================================================
        'Activity Code',                     // ❌ NOT in main KPI table
        'Project Name',                      // ❌ NOT in main KPI table
        'Project Full Name',                 // ❌ NOT in actual database
        'Project Status',                    // ❌ NOT in main KPI table (causes "Could not find column" error)
        'Zone Number',                       // ❌ NOT in main KPI table
        'Zone Ref',                          // ❌ NOT in actual database
        'Zone #',                            // ❌ NOT in actual database (use "Zone" instead)
        'Column 44',                         // ❌ NOT in actual database
        'Column 45',                         // ❌ NOT in actual database
        'Activity Division',                 // ❌ NOT in actual database (may exist in some schemas but not production)
        'Week',                              // ❌ NOT in actual database
        'Month',                             // ❌ NOT in actual database
        'Quarter',                           // ❌ NOT in actual database
        'Area',                              // ❌ NOT in actual database
        'Block',                             // ❌ NOT in actual database
        'Chainage',                          // ❌ NOT in actual database
        'Location',                          // ❌ NOT in actual database
        'Verified By',                      // ❌ NOT in actual database
        'Engineer Name',                     // ❌ NOT in actual database
        'Supervisor Name',                   // ❌ NOT in actual database
        'Quality Rating',                    // ❌ NOT in actual database
        'Completion Status',                 // ❌ NOT in actual database
        'Inspection Status',                 // ❌ NOT in actual database
        'Test Results',                      // ❌ NOT in actual database
        'Productivity Rate',                  // ❌ NOT in actual database
        'Efficiency %',                      // ❌ NOT in actual database
        'Variance',                          // ❌ NOT in actual database
        'Variance %',                        // ❌ NOT in actual database
        'Cumulative Quantity',               // ❌ NOT in actual database
        'Cumulative Value',                  // ❌ NOT in actual database
        'Cost',                              // ❌ NOT in actual database
        'Budget',                            // ❌ NOT in actual database
        'Recorded Date',                     // ❌ NOT in actual database
        'Submission Date',                   // ❌ NOT in actual database
        'Rate'                                // ❌ NOT in actual database (may exist in some schemas but not production)
      ]
      
      // Remove invalid columns
      invalidColumns.forEach(column => {
        delete mainTableData[column]
      })
      
      // ✅ Explicitly preserve critical fields that should NOT be lost
      // These fields are important for tracking and should be preserved
      const criticalFields = {
        'Target Date': kpiDataObj['Target Date'],
        'Actual Date': kpiDataObj['Actual Date'],
        'Activity Date': kpiDataObj['Activity Date'],
        'created_by': kpiDataObj['created_by'] || kpiDataObj.created_by,
        'updated_by': kpiDataObj['updated_by'] || kpiDataObj.updated_by,
        'Recorded By': kpiDataObj['Recorded By']
      }
      
      // Restore critical fields if they were accidentally removed
      Object.entries(criticalFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          mainTableData[key] = value
        }
      })
      
      // ✅ Preserve all other columns (including any custom/additional fields)
      // This ensures no data is lost during restore

      // ✅ Step 3: Insert into main KPI table
      const { data: insertedData, error: insertError } = await supabase
        .from(TABLES.KPI)
        .insert(mainTableData as any)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error inserting into main table:', insertError)
        throw insertError
      }

      const insertedKpiId = (insertedData as any)?.id
      if (!insertedKpiId) {
        throw new Error('Failed to get inserted KPI ID')
      }

      console.log(`✅ Successfully inserted KPI into main table with ID: ${insertedKpiId}`)

      // ✅ Step 4: Delete from rejected table (CRITICAL - must succeed)
      const { error: deleteError, data: deleteData } = await supabase
        .from(TABLES.KPI_REJECTED)
        .delete()
        .eq('id', rejectedKpiId)
        .select()

      if (deleteError) {
        console.error('❌ Error deleting from rejected table:', deleteError)
        // If delete fails, rollback the insert to avoid duplicates
        console.log(`🔄 Rolling back insert - deleting KPI ${insertedKpiId} from main table`)
        const { error: rollbackError } = await supabase
          .from(TABLES.KPI)
          .delete()
          .eq('id', insertedKpiId)
        
        if (rollbackError) {
          console.error('❌ Error rolling back insert:', rollbackError)
          throw new Error(`Failed to delete from rejected table and rollback failed. KPI may be duplicated. Please contact administrator. Original error: ${deleteError.message}`)
        }
        
        throw new Error(`Failed to delete from rejected table: ${deleteError.message}. The restore was cancelled to avoid duplicates.`)
      }

      console.log(`✅ Successfully deleted rejected KPI ${rejectedKpiId} from rejected table`)
      setSuccess(`KPI restored successfully and removed from rejected list!`)
      
      // Remove from rejected list
      setRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      setFilteredRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      
      // Refresh lists after short delay
      setTimeout(() => {
        fetchRejectedKPIs()
        fetchPendingKPIs()
      }, 1000)

    } catch (err: any) {
      console.error('Error restoring rejected KPI:', err)
      setError(err.message || 'Failed to restore KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(rejectedKpiId)
        return newSet
      })
    }
  }

  // ✅ Approve rejected KPI (move to main table and approve it)
  const handleApproveRejected = async (rejectedKpiId: string, editedData?: Partial<PendingKPI>) => {
    if (processingIds.has(rejectedKpiId)) return

    try {
      setProcessingIds(prev => new Set(prev).add(rejectedKpiId))
      setError('')
      setSuccess('')

      // ✅ Step 1: Fetch the rejected KPI data
      const { data: rejectedData, error: fetchError } = await supabase
        .from(TABLES.KPI_REJECTED)
        .select('*')
        .eq('id', rejectedKpiId)
        .single()

      if (fetchError || !rejectedData) {
        throw new Error(fetchError?.message || 'Failed to fetch rejected KPI data')
      }

      // ✅ Step 2: Prepare data for main table (preserve ALL data except rejection-specific and invalid columns)
      const kpiDataObj = rejectedData as Record<string, any>
      
      // ✅ Copy ALL data first (preserve everything)
      const mainTableData: any = { ...kpiDataObj }
      
      // ✅ Remove rejection-specific fields only
      delete mainTableData['Rejection Reason']
      delete mainTableData['Rejected By']
      delete mainTableData['Rejected Date']
      delete mainTableData['Original KPI ID']
      delete mainTableData.id // Generate new ID
      
      // ✅ Remove ONLY columns that definitely don't exist in main KPI table
      // COMPREHENSIVE LIST: All columns that exist in kpi_rejected but NOT in "Planning Database - KPI"
      // Based on PRODUCTION_SCHEMA_COMPLETE.sql - the actual KPI table only has these columns:
      // id, Project Full Code, Project Code, Project Sub Code, Activity Name, Activity, Input Type,
      // Quantity, Unit, Section, Zone, Drilled Meters, Value, Target Date, Actual Date, Activity Date,
      // Day, Recorded By, Notes, created_at, updated_at
      // Plus potentially: Activity Timing, Approval Status, Approved By, Approval Date (from migrations)
      const invalidColumns = [
        // ============================================================
        // REJECTION-SPECIFIC FIELDS (must be removed)
        // ============================================================
        'Rejection Reason',
        'Rejected By',
        'Rejected Date',
        'Original KPI ID',
        
        // ============================================================
        // METADATA FIELDS (rejected table specific)
        // ============================================================
        // Note: created_by and updated_by are PRESERVED - they exist in main KPI table
        // Only remove them if they cause errors (they shouldn't)
        
        // ============================================================
        // BOQ-SPECIFIC CALCULATED FIELDS (not in main KPI table)
        // ============================================================
        'Activity Actual Status',
        'Activity Planned Status',
        'Activity Planned Start Date',
        'Activity Planned Completion Date',
        'Activity Delayed?',
        'Activity On Track?',
        'Activity Completed',
        'Activity Scope',                    // ❌ NOT in main KPI table
        'Remaining Work Value',
        'Variance Works Value',
        'LookAhead Start Date',
        'LookAhead Activity Completion Date',
        'Remaining LookAhead Duration For Activity Completion',
        
        // ============================================================
        // CALCULATED/PROGRESS FIELDS (NOT in actual database)
        // ============================================================
        'Activity Progress %',               // ❌ NOT in actual database
        'Planned Value',                     // ❌ NOT in actual database
        'Earned Value',                      // ❌ NOT in actual database
        'Delay %',                           // ❌ NOT in actual database
        'Planned Progress %',                // ❌ NOT in actual database
        'Drilled Meters Planned Progress',   // ❌ NOT in actual database
        'Drilled Meters Actual Progress',    // ❌ NOT in actual database
        'Remaining Meters',                  // ❌ NOT in actual database
        'Variance Units',                    // ❌ NOT in actual database
        'Diffrence',                         // ❌ NOT in actual database
        'Total Units',                       // ❌ NOT in actual database
        'Planned Units',                     // ❌ NOT in actual database
        'Actual Units',                      // ❌ NOT in actual database
        'Total Value',                       // ❌ NOT in actual database
        'Productivity Daily Rate',           // ❌ NOT in actual database
        'Total Drilling Meters',             // ❌ NOT in actual database
        'Planned Activity Start Date',       // ❌ NOT in actual database
        'Deadline',                          // ❌ NOT in actual database
        'Calendar Duration',                 // ❌ NOT in actual database
        'Reported on Data Date?',            // ❌ NOT in actual database
        
        // ============================================================
        // COLUMNS ADDED TO REJECTED TABLE (definitely NOT in main KPI)
        // ============================================================
        'Activity Code',                     // ❌ NOT in main KPI table
        'Project Name',                      // ❌ NOT in main KPI table
        'Project Full Name',                 // ❌ NOT in actual database
        'Project Status',                    // ❌ NOT in main KPI table (causes "Could not find column" error)
        'Zone Number',                       // ❌ NOT in main KPI table
        'Zone Ref',                          // ❌ NOT in actual database
        'Zone #',                            // ❌ NOT in actual database (use "Zone" instead)
        'Column 44',                         // ❌ NOT in actual database
        'Column 45',                         // ❌ NOT in actual database
        'Activity Division',                 // ❌ NOT in actual database (may exist in some schemas but not production)
        'Week',                              // ❌ NOT in actual database
        'Month',                             // ❌ NOT in actual database
        'Quarter',                           // ❌ NOT in actual database
        'Area',                              // ❌ NOT in actual database
        'Block',                             // ❌ NOT in actual database
        'Chainage',                          // ❌ NOT in actual database
        'Location',                          // ❌ NOT in actual database
        'Verified By',                      // ❌ NOT in actual database
        'Engineer Name',                     // ❌ NOT in actual database
        'Supervisor Name',                   // ❌ NOT in actual database
        'Quality Rating',                    // ❌ NOT in actual database
        'Completion Status',                 // ❌ NOT in actual database
        'Inspection Status',                 // ❌ NOT in actual database
        'Test Results',                      // ❌ NOT in actual database
        'Productivity Rate',                  // ❌ NOT in actual database
        'Efficiency %',                      // ❌ NOT in actual database
        'Variance',                          // ❌ NOT in actual database
        'Variance %',                        // ❌ NOT in actual database
        'Cumulative Quantity',               // ❌ NOT in actual database
        'Cumulative Value',                  // ❌ NOT in actual database
        'Cost',                              // ❌ NOT in actual database
        'Budget',                            // ❌ NOT in actual database
        'Recorded Date',                     // ❌ NOT in actual database
        'Submission Date',                   // ❌ NOT in actual database
        'Rate'                                // ❌ NOT in actual database (may exist in some schemas but not production)
      ]
      
      // Remove invalid columns
      invalidColumns.forEach(column => {
        delete mainTableData[column]
      })
      
      // ✅ Explicitly preserve critical fields that should NOT be lost
      // These fields are important for tracking and should be preserved
      const criticalFields = {
        'Target Date': kpiDataObj['Target Date'],
        'Actual Date': kpiDataObj['Actual Date'],
        'Activity Date': kpiDataObj['Activity Date'],
        'created_by': kpiDataObj['created_by'] || kpiDataObj.created_by,
        'updated_by': kpiDataObj['updated_by'] || kpiDataObj.updated_by,
        'Recorded By': kpiDataObj['Recorded By']
      }
      
      // Restore critical fields if they were accidentally removed
      Object.entries(criticalFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          mainTableData[key] = value
        }
      })
      
      // ✅ Preserve all other columns (including any custom/additional fields)
      // This ensures no data is lost during restore

      // ✅ Step 3: Apply edited data if provided
      if (editedData && Object.keys(editedData).length > 0) {
        if (editedData.project_full_code !== undefined) mainTableData['Project Full Code'] = editedData.project_full_code
        if (editedData.project_code !== undefined) mainTableData['Project Code'] = editedData.project_code
        if (editedData.activity_name !== undefined) mainTableData['Activity Name'] = editedData.activity_name
        if (editedData.quantity !== undefined) mainTableData['Quantity'] = String(editedData.quantity)
        if (editedData.unit !== undefined) mainTableData['Unit'] = editedData.unit
        if (editedData.target_date !== undefined) mainTableData['Target Date'] = editedData.target_date
        if (editedData.section !== undefined) mainTableData['Section'] = editedData.section
        if (editedData.zone !== undefined) mainTableData['Zone'] = editedData.zone
        if (editedData.value !== undefined) mainTableData['Value'] = String(editedData.value)
      }

      // ✅ Step 4: Insert into main KPI table
      const { data: insertedData, error: insertError } = await supabase
        .from(TABLES.KPI)
        .insert(mainTableData)
        .select()
        .single()

      if (insertError || !insertedData) {
        console.error('Error inserting into main table:', insertError)
        throw insertError || new Error('Failed to insert KPI')
      }

      // ✅ Step 5: Approve the inserted KPI
      const userEmail = appUser?.email || authUser?.email || guard.user?.email || null
      const userId = authUser?.id || appUser?.id || guard.user?.id || null
      const approvedByValue = userEmail || userId || 'admin'

      const updatePayload: any = {}
      updatePayload['Approval Status'] = 'approved'
      updatePayload['Approved By'] = approvedByValue
      updatePayload['Approval Date'] = new Date().toISOString().split('T')[0]

      const insertedKpiId = (insertedData as any)?.id
      if (!insertedKpiId) {
        throw new Error('Failed to get inserted KPI ID')
      }

      const { error: approveError } = await (supabase
        .from(TABLES.KPI) as any)
        .update(updatePayload)
        .eq('id', insertedKpiId)

      if (approveError) {
        console.error('Error approving KPI:', approveError)
        // Don't throw - the KPI is already in main table
      }

      // ✅ Step 6: Delete from rejected table (CRITICAL - must succeed)
      const { error: deleteError, data: deleteData } = await supabase
        .from(TABLES.KPI_REJECTED)
        .delete()
        .eq('id', rejectedKpiId)
        .select()

      if (deleteError) {
        console.error('❌ Error deleting from rejected table:', deleteError)
        // If delete fails, try to rollback the insert to avoid duplicates
        const { error: rollbackError } = await supabase
          .from(TABLES.KPI)
          .delete()
          .eq('Project Full Code', mainTableData['Project Full Code'])
          .eq('Activity Name', mainTableData['Activity Name'])
          .eq('Activity Date', mainTableData['Activity Date'] || mainTableData['Actual Date'] || mainTableData['Target Date'])
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (rollbackError) {
          console.error('❌ Error rolling back insert:', rollbackError)
        }
        
        throw new Error(`Failed to delete from rejected table: ${deleteError.message}. The KPI was not restored to avoid duplicates.`)
      }

      console.log(`✅ Successfully deleted rejected KPI ${rejectedKpiId} from rejected table`)

      setSuccess(`KPI approved and moved to main table successfully!`)
      
      // Remove from rejected list
      setRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      setFilteredRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      
      // Refresh lists after short delay
      setTimeout(() => {
        fetchRejectedKPIs()
        fetchPendingKPIs()
      }, 1000)

    } catch (err: any) {
      console.error('Error approving rejected KPI:', err)
      setError(err.message || 'Failed to approve KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(rejectedKpiId)
        return newSet
      })
    }
  }

  // ✅ Delete pending KPI
  const handleDeletePending = async (kpiId: string) => {
    if (processingIds.has(kpiId)) return

    if (!confirm('Are you sure you want to delete this KPI? This action cannot be undone.')) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(kpiId))
      setError('')
      setSuccess('')

      const { error: deleteError } = await supabase
        .from(TABLES.KPI)
        .delete()
        .eq('id', kpiId)

      if (deleteError) {
        throw deleteError
      }

      setSuccess('KPI deleted successfully!')
      
      // Remove from list
      setPendingKPIs(prev => prev.filter(kpi => kpi.id !== kpiId))
      setFilteredKPIs(prev => prev.filter(kpi => kpi.id !== kpiId))
      
      // Refresh list after short delay
      setTimeout(() => {
        fetchPendingKPIs()
      }, 500)

    } catch (err: any) {
      console.error('Error deleting KPI:', err)
      setError(err.message || 'Failed to delete KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(kpiId)
        return newSet
      })
    }
  }

  // ✅ Delete rejected KPI
  const handleDeleteRejected = async (rejectedKpiId: string) => {
    if (processingIds.has(rejectedKpiId)) return

    if (!confirm('Are you sure you want to permanently delete this rejected KPI? This action cannot be undone.')) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(rejectedKpiId))
      setError('')
      setSuccess('')

      const { error: deleteError } = await supabase
        .from(TABLES.KPI_REJECTED)
        .delete()
        .eq('id', rejectedKpiId)

      if (deleteError) {
        throw deleteError
      }

      setSuccess('Rejected KPI deleted successfully!')
      
      // Remove from list
      setRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      setFilteredRejectedKPIs(prev => prev.filter(kpi => kpi.id !== rejectedKpiId))
      
      // Refresh list after short delay
      setTimeout(() => {
        fetchRejectedKPIs()
      }, 500)

    } catch (err: any) {
      console.error('Error deleting rejected KPI:', err)
      setError(err.message || 'Failed to delete rejected KPI')
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(rejectedKpiId)
        return newSet
      })
    }
  }

  // ✅ Selection handlers for Pending KPIs
  const handleSelectPendingKPI = (kpiId: string) => {
    setSelectedPendingKPIs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(kpiId)) {
        newSet.delete(kpiId)
      } else {
        newSet.add(kpiId)
      }
      return newSet
    })
  }

  const handleSelectAllPendingKPIs = () => {
    const currentKPIs = filteredKPIs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const allSelected = currentKPIs.every(kpi => selectedPendingKPIs.has(kpi.id))
    
    if (allSelected) {
      // Deselect all on current page
      const newSet = new Set(selectedPendingKPIs)
      currentKPIs.forEach(kpi => newSet.delete(kpi.id))
      setSelectedPendingKPIs(newSet)
    } else {
      // Select all on current page
      const newSet = new Set(selectedPendingKPIs)
      currentKPIs.forEach(kpi => newSet.add(kpi.id))
      setSelectedPendingKPIs(newSet)
    }
  }

  // ✅ Selection handlers for Rejected KPIs
  const handleSelectRejectedKPI = (kpiId: string) => {
    setSelectedRejectedKPIs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(kpiId)) {
        newSet.delete(kpiId)
      } else {
        newSet.add(kpiId)
      }
      return newSet
    })
  }

  const handleSelectAllRejectedKPIs = () => {
    const currentKPIs = filteredRejectedKPIs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    const allSelected = currentKPIs.every(kpi => selectedRejectedKPIs.has(kpi.id))
    
    if (allSelected) {
      // Deselect all on current page
      const newSet = new Set(selectedRejectedKPIs)
      currentKPIs.forEach(kpi => newSet.delete(kpi.id))
      setSelectedRejectedKPIs(newSet)
    } else {
      // Select all on current page
      const newSet = new Set(selectedRejectedKPIs)
      currentKPIs.forEach(kpi => newSet.add(kpi.id))
      setSelectedRejectedKPIs(newSet)
    }
  }

  // ✅ Bulk operations for Pending KPIs
  const handleBulkApprovePending = async () => {
    if (selectedPendingKPIs.size === 0) return

    if (!confirm(`Are you sure you want to approve ${selectedPendingKPIs.size} selected KPIs?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedPendingKPIs)
      
      for (const kpiId of ids) {
        await handleApprove(kpiId)
      }

      setSuccess(`Successfully approved ${ids.length} KPIs!`)
      setSelectedPendingKPIs(new Set())
      
      setTimeout(() => {
        fetchPendingKPIs()
      }, 1000)
    } catch (err: any) {
      console.error('Error bulk approving KPIs:', err)
      setError(err.message || 'Failed to approve some KPIs')
    }
  }

  const handleBulkRejectPending = async () => {
    if (selectedPendingKPIs.size === 0) return

    const reason = prompt(`Enter rejection reason for ${selectedPendingKPIs.size} KPIs:`)
    if (!reason) return

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedPendingKPIs)
      
      for (const kpiId of ids) {
        await handleReject(kpiId, reason)
      }

      setSuccess(`Successfully rejected ${ids.length} KPIs!`)
      setSelectedPendingKPIs(new Set())
      
      setTimeout(() => {
        fetchPendingKPIs()
      }, 1000)
    } catch (err: any) {
      console.error('Error bulk rejecting KPIs:', err)
      setError(err.message || 'Failed to reject some KPIs')
    }
  }

  const handleBulkDeletePending = async () => {
    if (selectedPendingKPIs.size === 0) return

    if (!confirm(`Are you sure you want to permanently delete ${selectedPendingKPIs.size} selected KPIs? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedPendingKPIs)
      
      for (const kpiId of ids) {
        await handleDeletePending(kpiId)
      }

      setSuccess(`Successfully deleted ${ids.length} KPIs!`)
      setSelectedPendingKPIs(new Set())
      
      setTimeout(() => {
        fetchPendingKPIs()
      }, 500)
    } catch (err: any) {
      console.error('Error bulk deleting KPIs:', err)
      setError(err.message || 'Failed to delete some KPIs')
    }
  }

  // ✅ Bulk operations for Rejected KPIs
  const handleBulkApproveRejected = async () => {
    if (selectedRejectedKPIs.size === 0) return

    if (!confirm(`Are you sure you want to approve ${selectedRejectedKPIs.size} selected rejected KPIs?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedRejectedKPIs)
      
      for (const kpiId of ids) {
        await handleApproveRejected(kpiId)
      }

      setSuccess(`Successfully approved ${ids.length} rejected KPIs!`)
      setSelectedRejectedKPIs(new Set())
      
      setTimeout(() => {
        fetchRejectedKPIs()
        fetchPendingKPIs()
      }, 1000)
    } catch (err: any) {
      console.error('Error bulk approving rejected KPIs:', err)
      setError(err.message || 'Failed to approve some KPIs')
    }
  }

  const handleBulkRestoreRejected = async () => {
    if (selectedRejectedKPIs.size === 0) return

    if (!confirm(`Are you sure you want to restore ${selectedRejectedKPIs.size} selected rejected KPIs?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedRejectedKPIs)
      
      for (const kpiId of ids) {
        await handleRestoreRejected(kpiId)
      }

      setSuccess(`Successfully restored ${ids.length} rejected KPIs!`)
      setSelectedRejectedKPIs(new Set())
      
      setTimeout(() => {
        fetchRejectedKPIs()
        fetchPendingKPIs()
      }, 1000)
    } catch (err: any) {
      console.error('Error bulk restoring rejected KPIs:', err)
      setError(err.message || 'Failed to restore some KPIs')
    }
  }

  const handleBulkDeleteRejected = async () => {
    if (selectedRejectedKPIs.size === 0) return

    if (!confirm(`Are you sure you want to permanently delete ${selectedRejectedKPIs.size} selected rejected KPIs? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setSuccess('')
      const ids = Array.from(selectedRejectedKPIs)
      
      for (const kpiId of ids) {
        await handleDeleteRejected(kpiId)
      }

      setSuccess(`Successfully deleted ${ids.length} rejected KPIs!`)
      setSelectedRejectedKPIs(new Set())
      
      setTimeout(() => {
        fetchRejectedKPIs()
      }, 500)
    } catch (err: any) {
      console.error('Error bulk deleting rejected KPIs:', err)
      setError(err.message || 'Failed to delete some KPIs')
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
      
      // ✅ Get user identifier (priority: email > appUser email > auth user email > user ID > 'admin')
      const userEmail = appUser?.email || authUser?.email || guard.user?.email || null
      const userId = authUser?.id || appUser?.id || guard.user?.id || null
      const approvedByValue = userEmail || userId || 'admin'
      
      const fetchChunkSize = 1000 // Fetch 1000 at a time
      const updateChunkSize = 50 // Update 50 at a time (smaller batches for updates)
      let offset = 0
      let totalApproved = 0
      let hasMore = true
      const approvalNote = `APPROVED:approved:by:${approvedByValue}:date:${new Date().toISOString().split('T')[0]}`
      
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
              updatePayload['Approved By'] = approvedByValue
              updatePayload['Approval Date'] = new Date().toISOString().split('T')[0]
              
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

  // ✅ Load user info from users table
  const loadUserInfo = async (userIds: string[]) => {
    try {
      const userMap = new Map<string, UserInfo>()
      
      for (const userId of userIds) {
        if (!userId || userId === 'System' || userId === 'Unknown' || userInfoCache.has(userId)) {
          continue
        }
        
        // Check if it's an email
        if (userId.includes('@')) {
          try {
            const { data: userByEmail, error: emailError } = await supabase
              .from('users')
              .select('id, email, full_name, phone_1, phone_2, role, division')
              .eq('email', userId)
              .single()
            
            if (!emailError && userByEmail) {
              const userData = userByEmail as any
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                phone_1: userData.phone_1,
                phone_2: userData.phone_2,
                role: userData.role,
                division: userData.division
              })
            } else {
              // If not found, use email as name
              userMap.set(userId, { name: userId.split('@')[0], email: userId })
            }
          } catch (e: any) {
            userMap.set(userId, { name: userId.split('@')[0], email: userId })
          }
        } else {
          // Try to find by ID
          try {
            const { data: userById, error: idError } = await supabase
              .from('users')
              .select('id, email, full_name, phone_1, phone_2, role, division')
              .eq('id', userId)
              .single()
            
            if (!idError && userById) {
              const userData = userById as any
              userMap.set(userId, {
                name: userData.full_name || userData.email?.split('@')[0] || userId,
                email: userData.email || userId,
                phone_1: userData.phone_1,
                phone_2: userData.phone_2,
                role: userData.role,
                division: userData.division
              })
            } else {
              userMap.set(userId, { name: userId, email: '' })
            }
          } catch (e: any) {
            userMap.set(userId, { name: userId, email: '' })
          }
        }
      }
      
      // Update cache
      setUserInfoCache(prev => {
        const newCache = new Map(prev)
        Array.from(userMap.entries()).forEach(([key, value]) => {
          newCache.set(key, value)
        })
        return newCache
      })
    } catch (err: any) {
      console.error('Error loading user info:', err)
    }
  }
  
  // ✅ Get user info for a KPI creator
  const getCreatorInfo = (kpi: PendingKPI): UserInfo | null => {
    const creatorId = kpi.created_by || (kpi as any)['created_by'] || (kpi as any)['Recorded By'] || null
    if (!creatorId) return null
    return userInfoCache.get(creatorId) || null
  }
  
  // ✅ Helper to clean phone number for WhatsApp link
  const cleanPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '')
  }
  
  // ✅ Get WhatsApp link for a phone number
  const getWhatsAppLink = (phone: string): string => {
    const cleanPhone = cleanPhoneNumber(phone)
    return `https://wa.me/${cleanPhone}`
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
    if (field === 'Project Full Code') {
      return kpi.project_full_code || kpi['Project Full Code'] || ''
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
  
  const getProjectName = (projectCode: string) => {
    if (!projectCode) return 'N/A'
    // ✅ Search by both project_full_code and project_code
    const project = projects.find(p => 
      p.project_full_code === projectCode || 
      p.project_code === projectCode ||
      p.project_full_code === projectCode.trim() ||
      p.project_code === projectCode.trim()
    )
    return project?.project_name || projectCode || 'N/A'
  }
  
  // ✅ Get unique values for filters (based on active tab)
  const currentKPIs = activeTab === 'pending' ? pendingKPIs : rejectedKPIs
  const uniqueProjects = Array.from(new Set(currentKPIs.map(kpi => 
    getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || ''
  ).filter(Boolean))).sort()
  
  // ✅ Smart filtering: If projects are selected, only show activities/zones from those projects
  const filteredKPIsForActivitiesZones = selectedProjects.length > 0
    ? currentKPIs.filter(kpi => {
        const projectCode = getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || ''
        return selectedProjects.includes(projectCode)
      })
    : currentKPIs
  
  const uniqueActivities = Array.from(new Set(filteredKPIsForActivitiesZones.map(kpi => 
    getField(kpi, 'Activity Name') || ''
  ).filter(Boolean))).sort()
  
  const uniqueZones = Array.from(new Set(filteredKPIsForActivitiesZones.map(kpi => 
    getField(kpi, 'Zone') || ''
  ).filter(Boolean))).sort()
  
  // ✅ Filter KPIs based on selected filters
  useEffect(() => {
    if (activeTab === 'pending') {
      let filtered = [...pendingKPIs]
      
      // Filter by Projects
      if (selectedProjects.length > 0) {
        filtered = filtered.filter(kpi => {
          const projectCode = getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || ''
          return selectedProjects.includes(projectCode)
        })
      }
      
      // Filter by Activities
      if (selectedActivities.length > 0) {
        filtered = filtered.filter(kpi => {
          const activityName = getField(kpi, 'Activity Name') || ''
          return selectedActivities.includes(activityName)
        })
      }
      
      // Filter by Zones
      if (selectedZones.length > 0) {
        filtered = filtered.filter(kpi => {
          const zone = getField(kpi, 'Zone') || ''
          return selectedZones.includes(zone)
        })
      }
      
      setFilteredKPIs(filtered)
    } else {
      let filtered = [...rejectedKPIs]
      
      // Filter by Projects
      if (selectedProjects.length > 0) {
        filtered = filtered.filter(kpi => {
          const projectCode = getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || ''
          return selectedProjects.includes(projectCode)
        })
      }
      
      // Filter by Activities
      if (selectedActivities.length > 0) {
        filtered = filtered.filter(kpi => {
          const activityName = getField(kpi, 'Activity Name') || ''
          return selectedActivities.includes(activityName)
        })
      }
      
      // Filter by Zones
      if (selectedZones.length > 0) {
        filtered = filtered.filter(kpi => {
          const zone = getField(kpi, 'Zone') || ''
          return selectedZones.includes(zone)
        })
      }
      
      setFilteredRejectedKPIs(filtered)
    }
    
    setCurrentPage(1) // Reset to first page when filters change
  }, [activeTab, pendingKPIs, rejectedKPIs, selectedProjects, selectedActivities, selectedZones])

  // ✅ Smart filter: Clear invalid activities and zones when projects change
  useEffect(() => {
    // Only run when projects, active tab, or KPIs change - not when activities/zones change
    const currentKPIsForValidation = activeTab === 'pending' ? pendingKPIs : rejectedKPIs
    
    // If projects are selected, filter KPIs to only those projects
    const validKPIs = selectedProjects.length > 0
      ? currentKPIsForValidation.filter(kpi => {
          const projectCode = getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || ''
          return selectedProjects.includes(projectCode)
        })
      : currentKPIsForValidation
    
    // Get valid activities and zones from the filtered KPIs
    const validActivities = Array.from(new Set(validKPIs.map(kpi => 
      getField(kpi, 'Activity Name') || ''
    ).filter(Boolean)))
    
    const validZones = Array.from(new Set(validKPIs.map(kpi => 
      getField(kpi, 'Zone') || ''
    ).filter(Boolean)))
    
    // Remove invalid activities (not in selected projects)
    // Use functional update to avoid dependency on selectedActivities
    setSelectedActivities(prev => {
      if (prev.length === 0) return prev
      const validSelectedActivities = prev.filter(activity => 
        validActivities.includes(activity)
      )
      return validSelectedActivities.length !== prev.length ? validSelectedActivities : prev
    })
    
    // Remove invalid zones (not in selected projects)
    // Use functional update to avoid dependency on selectedZones
    setSelectedZones(prev => {
      if (prev.length === 0) return prev
      const validSelectedZones = prev.filter(zone => 
        validZones.includes(zone)
      )
      return validSelectedZones.length !== prev.length ? validSelectedZones : prev
    })
  }, [selectedProjects, activeTab, pendingKPIs, rejectedKPIs])

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

              {/* ✅ Tab Navigation - Enhanced Design */}
              <div className="mt-6">
                <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-1.5 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 min-w-[180px] ${
                      activeTab === 'pending'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 transform'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Clock className={`w-5 h-5 ${activeTab === 'pending' ? 'text-white' : 'text-yellow-500'}`} />
                    <span>Pending Approval</span>
                    <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === 'pending'
                        ? 'bg-white/20 text-white'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {pendingKPIs.length}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('rejected')
                      if (rejectedKPIs.length === 0) {
                        fetchRejectedKPIs()
                      }
                    }}
                    className={`relative px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 min-w-[180px] ${
                      activeTab === 'rejected'
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg scale-105 transform'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <X className={`w-5 h-5 ${activeTab === 'rejected' ? 'text-white' : 'text-red-500'}`} />
                    <span>Rejected KPIs</span>
                    <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === 'rejected'
                        ? 'bg-white/20 text-white'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {rejectedKPIs.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* ✅ Approve All Button - Always visible */}
              {activeTab === 'pending' && pendingKPIs.length > 0 && guard.hasAccess('kpi.approve') && (
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

          {/* ✅ Filters Section */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Projects Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Projects
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearchTerm}
                      onChange={(e) => setProjectSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                    {uniqueProjects
                      .filter(p => !projectSearchTerm || p.toLowerCase().includes(projectSearchTerm.toLowerCase()))
                      .map(project => (
                        <label key={project} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProjects([...selectedProjects, project])
                              } else {
                                setSelectedProjects(selectedProjects.filter(p => p !== project))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{project}</span>
                        </label>
                      ))}
                  </div>
                </div>
                
                {/* Activities Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activities
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                    {uniqueActivities
                      .filter(a => !activitySearchTerm || a.toLowerCase().includes(activitySearchTerm.toLowerCase()))
                      .map(activity => (
                        <label key={activity} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedActivities.includes(activity)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedActivities([...selectedActivities, activity])
                              } else {
                                setSelectedActivities(selectedActivities.filter(a => a !== activity))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={activity}>{activity}</span>
                        </label>
                      ))}
                  </div>
                </div>
                
                {/* Zones Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zones
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search zones..."
                      value={zoneSearchTerm}
                      onChange={(e) => setZoneSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                    {uniqueZones
                      .filter(z => !zoneSearchTerm || z.toLowerCase().includes(zoneSearchTerm.toLowerCase()))
                      .map(zone => (
                        <label key={zone} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedZones.includes(zone)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedZones([...selectedZones, zone])
                              } else {
                                setSelectedZones(selectedZones.filter(z => z !== zone))
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{zone}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(selectedProjects.length > 0 || selectedActivities.length > 0 || selectedZones.length > 0) && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedProjects([])
                      setSelectedActivities([])
                      setSelectedZones([])
                      setProjectSearchTerm('')
                      setActivitySearchTerm('')
                      setZoneSearchTerm('')
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Summary Card */}
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      activeTab === 'pending' 
                        ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {activeTab === 'pending' ? (
                        <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {activeTab === 'pending' ? filteredKPIs.length : filteredRejectedKPIs.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {activeTab === 'pending' 
                          ? (filteredKPIs.length === pendingKPIs.length ? 'Pending KPIs' : `Filtered (${pendingKPIs.length} total)`)
                          : (filteredRejectedKPIs.length === rejectedKPIs.length ? 'Rejected KPIs' : `Filtered (${rejectedKPIs.length} total)`)
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ✅ Tab Content */}
          {activeTab === 'pending' ? (
            <>
              {/* ✅ Selection Header for Pending KPIs */}
              {filteredKPIs.length > 0 && (
                <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSelectAllPendingKPIs}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {(() => {
                        const currentKPIs = filteredKPIs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        const allSelected = currentKPIs.length > 0 && currentKPIs.every(kpi => selectedPendingKPIs.has(kpi.id))
                        return allSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )
                      })()}
                      <span>Select All ({selectedPendingKPIs.size} selected)</span>
                    </button>
                  </div>
                  {selectedPendingKPIs.size > 0 && guard.hasAccess('kpi.approve') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm text-blue-700 dark:text-blue-300 font-medium mr-2">
                        {selectedPendingKPIs.size} item{selectedPendingKPIs.size !== 1 ? 's' : ''} selected
                      </div>
                      <Button
                        onClick={handleBulkApprovePending}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve ({selectedPendingKPIs.size})
                      </Button>
                      <Button
                        onClick={handleBulkRejectPending}
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject ({selectedPendingKPIs.size})
                      </Button>
                      <Button
                        onClick={handleBulkDeletePending}
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedPendingKPIs.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination Controls - Top */}
              {filteredKPIs.length > itemsPerPage && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredKPIs.length)} of {filteredKPIs.length} KPIs
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
                  {Array.from({ length: Math.min(5, Math.ceil(filteredKPIs.length / itemsPerPage)) }, (_, i) => {
                    const totalPages = Math.ceil(filteredKPIs.length / itemsPerPage)
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
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredKPIs.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(filteredKPIs.length / itemsPerPage)}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(filteredKPIs.length / itemsPerPage))}
                  disabled={currentPage >= Math.ceil(filteredKPIs.length / itemsPerPage)}
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
              {filteredKPIs.length === 0 ? (
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
                const paginatedKPIs = filteredKPIs.slice(startIndex, endIndex)
                
                return paginatedKPIs.map((kpi) => (
                <Card key={kpi.id} className={`hover:shadow-lg transition-shadow ${selectedPendingKPIs.has(kpi.id) ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {/* ✅ Checkbox for individual selection */}
                        <button
                          onClick={() => handleSelectPendingKPI(kpi.id)}
                          className="flex-shrink-0 mt-1"
                          title={selectedPendingKPIs.has(kpi.id) ? 'Deselect' : 'Select'}
                        >
                          {selectedPendingKPIs.has(kpi.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                          )}
                        </button>
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
                              Project: {getProjectName(getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || '')} ({getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || 'N/A'})
                            </p>
                            {getField(kpi, 'Zone') && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Zone: {getField(kpi, 'Zone')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* ✅ Creator Information */}
                        {(() => {
                          const creatorInfo = getCreatorInfo(kpi)
                          if (creatorInfo) {
                            return (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Created By:</span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{creatorInfo.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  {/* Email */}
                                  {creatorInfo.email && (
                                    <a 
                                      href={`mailto:${creatorInfo.email}`}
                                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                                    >
                                      <Mail className="w-4 h-4" />
                                      <span>{creatorInfo.email}</span>
                                    </a>
                                  )}
                                  
                                  {/* Phone 1 */}
                                  {creatorInfo.phone_1 && (
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={`tel:${creatorInfo.phone_1}`}
                                        className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors"
                                      >
                                        <Phone className="w-4 h-4" />
                                        <span>{creatorInfo.phone_1}</span>
                                      </a>
                                      <a 
                                        href={getWhatsAppLink(creatorInfo.phone_1)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                        title={`WhatsApp: ${creatorInfo.phone_1}`}
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </a>
                                    </div>
                                  )}
                                  
                                  {/* Phone 2 */}
                                  {creatorInfo.phone_2 && (
                                    <div className="flex items-center gap-2">
                                      <a 
                                        href={`tel:${creatorInfo.phone_2}`}
                                        className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors"
                                      >
                                        <Phone className="w-4 h-4" />
                                        <span>{creatorInfo.phone_2}</span>
                                      </a>
                                      <a 
                                        href={getWhatsAppLink(creatorInfo.phone_2)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                        title={`WhatsApp: ${creatorInfo.phone_2}`}
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}

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
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <PermissionButton
                          permission="kpi.approve"
                          onClick={() => handleEdit(kpi)}
                          variant="outline"
                          className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </PermissionButton>
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
                          onClick={() => handleRejectClick(kpi.id)}
                          disabled={processingIds.has(kpi.id)}
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </PermissionButton>
                        <PermissionButton
                          permission="kpi.approve"
                          onClick={() => handleDeletePending(kpi.id)}
                          disabled={processingIds.has(kpi.id)}
                          variant="outline"
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
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
              {filteredKPIs.length > itemsPerPage && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredKPIs.length)} of {filteredKPIs.length} KPIs
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
                      {Array.from({ length: Math.min(5, Math.ceil(filteredKPIs.length / itemsPerPage)) }, (_, i) => {
                        const totalPages = Math.ceil(filteredKPIs.length / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredKPIs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredKPIs.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(filteredKPIs.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredKPIs.length / itemsPerPage)}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* ✅ Selection Header for Rejected KPIs */}
              {filteredRejectedKPIs.length > 0 && (
                <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSelectAllRejectedKPIs}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {(() => {
                        const currentKPIs = filteredRejectedKPIs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        const allSelected = currentKPIs.length > 0 && currentKPIs.every(kpi => selectedRejectedKPIs.has(kpi.id))
                        return allSelected ? (
                          <CheckSquare className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )
                      })()}
                      <span>Select All ({selectedRejectedKPIs.size} selected)</span>
                    </button>
                  </div>
                  {selectedRejectedKPIs.size > 0 && guard.hasAccess('kpi.approve') && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm text-red-700 dark:text-red-300 font-medium mr-2">
                        {selectedRejectedKPIs.size} item{selectedRejectedKPIs.size !== 1 ? 's' : ''} selected
                      </div>
                      <Button
                        onClick={handleBulkApproveRejected}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve ({selectedRejectedKPIs.size})
                      </Button>
                      <Button
                        onClick={handleBulkRestoreRejected}
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore ({selectedRejectedKPIs.size})
                      </Button>
                      <Button
                        onClick={handleBulkDeleteRejected}
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedRejectedKPIs.size})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Rejected KPIs List */}
              {loadingRejected ? (
                <Card>
                  <div className="p-12 text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rejected KPIs...</p>
                  </div>
                </Card>
              ) : filteredRejectedKPIs.length === 0 ? (
                <Card>
                  <div className="p-12 text-center">
                    <X className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No Rejected KPIs
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      There are no rejected KPIs to display.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const paginatedKPIs = filteredRejectedKPIs.slice(startIndex, endIndex)
                    
                    return paginatedKPIs.map((kpi) => (
                      <Card key={kpi.id} className={`hover:shadow-lg transition-shadow border-l-4 border-l-red-500 ${selectedRejectedKPIs.has(kpi.id) ? 'ring-2 ring-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                        <div className="p-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              {/* ✅ Checkbox for individual selection */}
                              <button
                                onClick={() => handleSelectRejectedKPI(kpi.id)}
                                className="flex-shrink-0 mt-1"
                                title={selectedRejectedKPIs.has(kpi.id) ? 'Deselect' : 'Select'}
                              >
                                {selectedRejectedKPIs.has(kpi.id) ? (
                                  <CheckSquare className="w-5 h-5 text-red-600 dark:text-red-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  </div>
                                  <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {getField(kpi, 'Activity Name') || 'N/A'}
                                  </h3>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Project: {getProjectName(getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || '')} ({getField(kpi, 'Project Full Code') || getField(kpi, 'Project Code') || 'N/A'})
                                  </p>
                                  {getField(kpi, 'Zone') && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      Zone: {getField(kpi, 'Zone')}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Rejection Info */}
                              {(kpi as any)['Rejection Reason'] && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Rejection Reason:</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 ml-6">
                                    {(kpi as any)['Rejection Reason']}
                                  </p>
                                  {(kpi as any)['Rejected By'] && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
                                      Rejected by: {(kpi as any)['Rejected By']} • {(kpi as any)['Rejected Date'] ? new Date((kpi as any)['Rejected Date']).toLocaleDateString() : 'N/A'}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Creator Information */}
                              {(() => {
                                const creatorInfo = getCreatorInfo(kpi)
                                if (creatorInfo) {
                                  return (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Created By:</span>
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{creatorInfo.name}</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-xs">
                                        {creatorInfo.email && (
                                          <a 
                                            href={`mailto:${creatorInfo.email}`}
                                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                                          >
                                            <Mail className="w-4 h-4" />
                                            <span>{creatorInfo.email}</span>
                                          </a>
                                        )}
                                        {creatorInfo.phone_1 && (
                                          <a 
                                            href={`tel:${creatorInfo.phone_1}`}
                                            className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors"
                                          >
                                            <Phone className="w-4 h-4" />
                                            <span>{creatorInfo.phone_1}</span>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              })()}

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
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Rejected Date</div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      try {
                                        return (kpi as any)['Rejected Date'] ? new Date((kpi as any)['Rejected Date']).toLocaleDateString() : 'N/A'
                                      } catch {
                                        return 'N/A'
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ✅ Action Buttons for Rejected KPIs */}
                              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <PermissionButton
                                permission="kpi.approve"
                                onClick={() => handleEdit(kpi)}
                                variant="outline"
                                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </PermissionButton>
                              <PermissionButton
                                permission="kpi.approve"
                                onClick={() => {
                                  if (editingKPI && editingKPI.id === kpi.id) {
                                    // If editing, approve with edited data
                                    handleApproveRejected(kpi.id, editingKPI)
                                    setShowEditModal(false)
                                    setEditingKPI(null)
                                  } else {
                                    // Direct approve
                                    handleApproveRejected(kpi.id)
                                  }
                                }}
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
                                onClick={() => handleRestoreRejected(kpi.id)}
                                disabled={processingIds.has(kpi.id)}
                                variant="outline"
                                className="border-purple-300 text-purple-600 hover:bg-purple-50"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore
                              </PermissionButton>
                              <PermissionButton
                                permission="kpi.approve"
                                onClick={() => handleDeleteRejected(kpi.id)}
                                disabled={processingIds.has(kpi.id)}
                                variant="outline"
                                className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </PermissionButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  })()}
                </div>
              )}

              {/* Pagination Controls for Rejected KPIs */}
              {filteredRejectedKPIs.length > itemsPerPage && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRejectedKPIs.length)} of {filteredRejectedKPIs.length} Rejected KPIs
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
                      {Array.from({ length: Math.min(5, Math.ceil(filteredRejectedKPIs.length / itemsPerPage)) }, (_, i) => {
                        const totalPages = Math.ceil(filteredRejectedKPIs.length / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredRejectedKPIs.length / itemsPerPage), prev + 1))}
                      disabled={currentPage >= Math.ceil(filteredRejectedKPIs.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(filteredRejectedKPIs.length / itemsPerPage))}
                      disabled={currentPage >= Math.ceil(filteredRejectedKPIs.length / itemsPerPage)}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ✅ Edit KPI Modal */}
      {showEditModal && editingKPI && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit KPI</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingKPI(null)
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Project Full Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Full Code
                  </label>
                  <input
                    type="text"
                    value={editingKPI.project_full_code || editingKPI['Project Full Code'] || ''}
                    onChange={(e) => setEditingKPI({ ...editingKPI, project_full_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Activity Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Name
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.activity_name || editingKPI?.['Activity Name'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, activity_name: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.quantity || editingKPI?.['Quantity'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, quantity: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.unit || editingKPI?.['Unit'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, unit: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editingKPI?.target_date || editingKPI?.['Target Date'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, target_date: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.section || editingKPI?.['Section'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, section: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Zone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zone
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.zone || editingKPI?.['Zone'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, zone: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Value
                  </label>
                  <input
                    type="text"
                    value={editingKPI?.value || editingKPI?.['Value'] || ''}
                    onChange={(e) => editingKPI && setEditingKPI({ ...editingKPI, value: e.target.value, id: editingKPI.id })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingKPI(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingKPI) {
                      handleSaveEdit(editingKPI)
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ✅ Reject KPI Modal */}
      {showRejectModal && rejectingKPIId && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reject KPI</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectingKPIId(null)
                    setRejectionReason('')
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectingKPIId(null)
                    setRejectionReason('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (rejectingKPIId) {
                      handleReject(rejectingKPIId, rejectionReason || undefined)
                      setShowRejectModal(false)
                      setRejectingKPIId(null)
                      setRejectionReason('')
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject KPI
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PermissionPage>
  )
}


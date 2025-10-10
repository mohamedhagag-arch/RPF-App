'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Holiday } from '@/lib/workdaysCalculator'
import { 
  getHolidays, 
  addHoliday, 
  updateHoliday, 
  deleteHoliday, 
  type DatabaseHoliday, 
  type HolidayFormData 
} from '@/lib/holidaysManager'
import { Calendar, Plus, Trash2, Save, Info, AlertCircle, CheckCircle } from 'lucide-react'

export function HolidaysSettings() {
  const guard = usePermissionGuard()
  const [holidays, setHolidays] = useState<DatabaseHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<DatabaseHoliday | null>(null)
  const [formData, setFormData] = useState<HolidayFormData>({
    date: '',
    name: '',
    description: '',
    is_recurring: false
  })

  useEffect(() => {
    loadHolidays()
  }, [])

  const loadHolidays = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getHolidays()
      setHolidays(data)
    } catch (error: any) {
      console.error('❌ Failed to load holidays:', error)
      setError('Failed to load holidays. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      
      if (editingHoliday) {
        // Update existing holiday
        await updateHoliday(editingHoliday.id, formData)
        setSuccess('Holiday updated successfully!')
      } else {
        // Add new holiday
        await addHoliday(formData)
        setSuccess('Holiday added successfully!')
      }
      
      // Reset form
      setFormData({ date: '', name: '', description: '', is_recurring: false })
      setShowAddForm(false)
      setEditingHoliday(null)
      
      // Reload holidays
      await loadHolidays()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('❌ Failed to save holiday:', error)
      setError(error.message || 'Failed to save holiday. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    setFormData({ date: '', name: '', description: '', is_recurring: false })
    setEditingHoliday(null)
    setShowAddForm(true)
    setError('')
    setSuccess('')
  }

  const handleEdit = (holiday: DatabaseHoliday) => {
    setFormData({
      date: holiday.date,
      name: holiday.name,
      description: holiday.description || '',
      is_recurring: holiday.is_recurring
    })
    setEditingHoliday(holiday)
    setShowAddForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (holiday: DatabaseHoliday) => {
    if (confirm(`Are you sure you want to delete "${holiday.name}"?`)) {
      try {
        setSaving(true)
        setError('')
        
        await deleteHoliday(holiday.id)
        setSuccess('Holiday deleted successfully!')
        
        // Reload holidays
        await loadHolidays()
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } catch (error: any) {
        console.error('❌ Failed to delete holiday:', error)
        setError(error.message || 'Failed to delete holiday. Please try again.')
      } finally {
        setSaving(false)
      }
    }
  }

  const handleCancel = () => {
    setFormData({ date: '', name: '', description: '', is_recurring: false })
    setEditingHoliday(null)
    setShowAddForm(false)
    setError('')
    setSuccess('')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading holidays...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Holidays Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure public holidays and non-working days
          </p>
        </div>
        
        <div className="flex gap-3">
          {guard.hasAccess('settings.holidays.create') && (
            <ModernButton 
              variant="gradient" 
              onClick={handleAdd} 
              icon={<Plus className="h-4 w-4" />} 
              size="sm"
            >
              Add Holiday
            </ModernButton>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <ModernCard className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              How it works
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li>• These holidays will be excluded from duration calculations</li>
              <li>• Recurring holidays repeat every year (e.g., National Day)</li>
              <li>• Non-recurring holidays are for specific dates only</li>
              <li>• KPI generation will skip these days automatically</li>
            </ul>
          </div>
        </div>
      </ModernCard>

      {/* Add Holiday Form */}
      {showAddForm && (
        <ModernCard className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">
            {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Holiday name"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">
                  Recurring annually
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <ModernButton 
              onClick={handleSave} 
              size="sm" 
              variant="primary"
              disabled={saving || !formData.date || !formData.name}
            >
              {saving ? 'Saving...' : (editingHoliday ? 'Update Holiday' : 'Add Holiday')}
            </ModernButton>
            <ModernButton 
              onClick={handleCancel} 
              size="sm" 
              variant="ghost"
              disabled={saving}
            >
              Cancel
            </ModernButton>
          </div>
        </ModernCard>
      )}


      {/* Holidays List */}
      <ModernCard>
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-bold text-gray-900 dark:text-white">
            Configured Holidays ({holidays.length})
          </h3>
        </div>

        <div className="space-y-3">
          {holidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No holidays configured yet
              </p>
              <ModernButton
                onClick={handleAdd}
                variant="gradient"
                icon={<Plus className="h-4 w-4" />}
                size="sm"
              >
                Add Your First Holiday
              </ModernButton>
            </div>
          ) : (
            holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {holiday.name}
                    </p>
                    {holiday.is_recurring && (
                      <ModernBadge variant="purple" size="sm">
                        Recurring
                      </ModernBadge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(holiday.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  {holiday.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {holiday.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {guard.hasAccess('settings.holidays.edit') && (
                    <ModernButton
                      onClick={() => handleEdit(holiday)}
                      variant="outline"
                      size="sm"
                      disabled={saving}
                    >
                      Edit
                    </ModernButton>
                  )}
                  {guard.hasAccess('settings.holidays.delete') && (
                    <ModernButton
                      onClick={() => handleDelete(holiday)}
                      variant="outline"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4" />}
                      disabled={saving}
                    >
                      Delete
                    </ModernButton>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ModernCard>

      {/* Weekend Settings */}
      <ModernCard>
        <h3 className="font-bold text-gray-900 dark:text-white mb-4">
          Weekend Days
        </h3>
        
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div
              key={day}
              className={`p-3 text-center rounded-lg font-medium ${
                index === 0
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          Sunday is configured as the default weekend day. You can override this in compressed projects.
        </p>
      </ModernCard>
    </div>
  )
}



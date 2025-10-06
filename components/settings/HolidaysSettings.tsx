'use client'

import { useState, useEffect } from 'react'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Holiday, UAE_HOLIDAYS } from '@/lib/workdaysCalculator'
import { Calendar, Plus, Trash2, Save, Info } from 'lucide-react'

export function HolidaysSettings() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHoliday, setNewHoliday] = useState<Holiday>({
    date: '',
    name: '',
    isRecurring: false
  })

  useEffect(() => {
    // Load holidays from localStorage or use defaults
    const saved = localStorage.getItem('project_holidays')
    if (saved) {
      try {
        setHolidays(JSON.parse(saved))
      } catch {
        setHolidays(UAE_HOLIDAYS)
      }
    } else {
      setHolidays(UAE_HOLIDAYS)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('project_holidays', JSON.stringify(holidays))
    alert('✅ Holidays saved successfully!')
  }

  const handleAdd = () => {
    if (newHoliday.date && newHoliday.name) {
      setHolidays([...holidays, { ...newHoliday }])
      setNewHoliday({ date: '', name: '', isRecurring: false })
      setShowAddForm(false)
    }
  }

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      setHolidays(holidays.filter((_, i) => i !== index))
    }
  }

  const handleReset = () => {
    if (confirm('Reset to default UAE holidays?')) {
      setHolidays(UAE_HOLIDAYS)
    }
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
          <ModernButton variant="outline" onClick={handleReset} size="sm">
            Reset to Defaults
          </ModernButton>
          <ModernButton variant="gradient" onClick={handleSave} icon={<Save className="h-4 w-4" />} size="sm">
            Save Changes
          </ModernButton>
        </div>
      </div>

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
            Add New Holiday
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <Input
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <Input
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                placeholder="Holiday name"
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
                  checked={newHoliday.isRecurring}
                  onChange={(e) => setNewHoliday({ ...newHoliday, isRecurring: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-gray-300">
                  Recurring annually
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <ModernButton onClick={handleAdd} size="sm" variant="primary">
              Add Holiday
            </ModernButton>
            <ModernButton onClick={() => setShowAddForm(false)} size="sm" variant="ghost">
              Cancel
            </ModernButton>
          </div>
        </ModernCard>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <ModernButton
          onClick={() => setShowAddForm(true)}
          variant="outline"
          icon={<Plus className="h-4 w-4" />}
          fullWidth
        >
          Add New Holiday
        </ModernButton>
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
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No holidays configured
            </p>
          ) : (
            holidays.map((holiday, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {holiday.name}
                    </p>
                    {holiday.isRecurring && (
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
                </div>
                
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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



'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Search, ChevronDown, X, User, Mail, Phone, Check } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface User {
  id: string
  email: string
  full_name: string
  phone_1?: string
  phone_2?: string
  department_name_en?: string
  job_title_en?: string
}

interface UserEmailSelectProps {
  value: string
  onChange: (email: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  label?: string
  disabled?: boolean
}

export function UserEmailSelect({
  value,
  onChange,
  placeholder = 'Select user or enter email',
  className = '',
  required = false,
  label,
  disabled = false
}: UserEmailSelectProps) {
  const [users, setUsers] = useState<User[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch users from directory
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const supabase = getSupabaseClient()
        
        const { data, error } = await supabase
          .from('user_profiles_complete')
          .select('id, email, full_name, phone_1, phone_2, department_name_en, job_title_en')
          .eq('is_active', true)
          .order('full_name', { ascending: true })

        if (error) {
          console.error('Error fetching users:', error)
          return
        }

        if (data) {
          setUsers(data as User[])
        }
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.department_name_en && user.department_name_en.toLowerCase().includes(searchLower)) ||
      (user.job_title_en && user.job_title_en.toLowerCase().includes(searchLower))
    )
  })

  const handleSelect = (user: User) => {
    onChange(user.email)
    setShowDropdown(false)
    setSearchTerm('')
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSearchTerm(newValue)
    if (!showDropdown && newValue) {
      setShowDropdown(true)
    }
  }

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
    inputRef.current?.focus()
  }

  // Find selected user
  const selectedUser = value ? users.find(u => u.email.toLowerCase() === value.toLowerCase()) : null

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="email"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              tabIndex={-1}
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, department..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Users list */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    value === user.email
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.full_name}
                        </p>
                        {value === user.email && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {(user.department_name_en || user.job_title_en) && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {user.department_name_en && (
                            <span className="truncate">{user.department_name_en}</span>
                          )}
                          {user.department_name_en && user.job_title_en && <span>•</span>}
                          {user.job_title_en && (
                            <span className="truncate">{user.job_title_en}</span>
                          )}
                        </div>
                      )}
                      {user.phone_1 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mt-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{user.phone_1}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}


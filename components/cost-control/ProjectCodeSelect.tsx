'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Search, ChevronDown, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES } from '@/lib/supabase'
import type { Project } from '@/lib/supabase'

interface ProjectCodeSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function ProjectCodeSelect({
  value,
  onChange,
  placeholder = 'Project code',
  className = '',
  required = false
}: ProjectCodeSelectProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [uniqueProjectCodes, setUniqueProjectCodes] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch projects and extract unique project codes
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        const supabase = getSupabaseClient()
        
        // Use correct column names from database (with spaces)
        const { data, error } = await supabase
          .from(TABLES.PROJECTS)
          .select('"Project Code", "Project Sub-Code"')
          .order('"Project Code"', { ascending: true })

        if (error) {
          console.error('Error fetching projects:', error)
          return
        }

        if (data && data.length > 0) {
          setProjects(data as any[])
          
          // Extract unique project codes (main code only, without sub-code)
          // Example: "5066 - I2" -> "5066"
          const codesSet = new Set<string>()
          data.forEach((project: any) => {
            // Support both database column names (with spaces) and application field names
            const projectCode = project['Project Code'] || project.project_code || ''
            if (projectCode && projectCode.toString().trim()) {
              // Extract main code (before any dash or space)
              const mainCode = projectCode.toString().split(/[\s-]/)[0].trim()
              if (mainCode) {
                codesSet.add(mainCode)
              }
            }
          })
          
          // Convert to sorted array
          const uniqueCodes = Array.from(codesSet).sort((a, b) => {
            // Sort numerically if both are numbers, otherwise alphabetically
            const numA = parseInt(a)
            const numB = parseInt(b)
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB
            }
            return a.localeCompare(b)
          })
          
          setUniqueProjectCodes(uniqueCodes)
          console.log('✅ Loaded project codes:', uniqueCodes.length, uniqueCodes.slice(0, 5))
        } else {
          console.warn('⚠️ No projects found in database')
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
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

  // Filter project codes based on search
  const filteredCodes = uniqueProjectCodes.filter(code =>
    code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = useCallback((code: string) => {
    onChange(code)
    setShowDropdown(false)
    setSearchTerm('')
    inputRef.current?.blur()
  }, [onChange])

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
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
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search project codes..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Project codes list */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No project codes found' : 'No project codes available'}
              </div>
            ) : (
              filteredCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    value === code
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {code}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}


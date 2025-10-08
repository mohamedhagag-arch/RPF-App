'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Settings, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserDropdownProps {
  userName: string
  userRole: string
  onProfileClick: () => void
  onSettingsClick: () => void
  onSignOut: () => void
}

export function UserDropdown({ 
  userName, 
  userRole, 
  onProfileClick, 
  onSettingsClick, 
  onSignOut 
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleItemClick = (callback: () => void) => {
    callback()
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
        title="User Menu"
      >
        <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {userName}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {userName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {userRole}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => handleItemClick(onProfileClick)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <User className="h-4 w-4" />
              My Profile
            </button>
            
            <button
              onClick={() => handleItemClick(onSettingsClick)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
            <button
              onClick={() => handleItemClick(onSignOut)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

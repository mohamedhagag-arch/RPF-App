'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Settings, User, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DropdownPosition {
  top: number
  right: number
}

interface ScrollState {
  isScrolled: boolean
  lastScrollY: number
}

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
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, right: 0 })
  const [scrollState, setScrollState] = useState<ScrollState>({ isScrolled: false, lastScrollY: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      // Position dropdown below the button
      setDropdownPosition({
        top: buttonRect.bottom + 8, // Position below the button
        right: window.innerWidth - buttonRect.right
      })
    }
  }

  const handleToggleDropdown = () => {
    if (!isOpen) {
      calculateDropdownPosition()
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative z-[99999] dropdown-container inline-block" ref={dropdownRef}>
      {/* User Button */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
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
        <div 
          className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[99999] dropdown-menu"
          style={{ 
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
            zIndex: 99999
          }}
        >
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

'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { cn } from '@/lib/utils'
import { getCachedCompanySettings, type CompanySettings } from '@/lib/companySettings'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Target,
  BarChart3,
  Settings,
  Users,
  FileDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  User
} from 'lucide-react'

interface SidebarItem {
  icon: any
  label: string
  tab: string
  badge?: number
  badgeColor?: string
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' },
  { icon: FolderKanban, label: 'Projects', tab: 'projects', badge: 5, badgeColor: 'bg-blue-500' },
  { icon: ClipboardList, label: 'BOQ', tab: 'boq', badge: 12, badgeColor: 'bg-green-500' },
  { icon: Target, label: 'KPI', tab: 'kpi', badge: 8, badgeColor: 'bg-purple-500' },
  { icon: BarChart3, label: 'Reports', tab: 'reports' },
  { icon: Users, label: 'Directory', tab: 'directory' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
]

interface ModernSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userName?: string
  userRole?: string
  onProfileClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
}

export function ModernSidebar({ activeTab, onTabChange, userName = 'User', userRole = 'Admin', onProfileClick, onCollapseChange }: ModernSidebarProps) {
  const guard = usePermissionGuard()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [companyName, setCompanyName] = useState('AlRabat RPF')
  const [companySlogan, setCompanySlogan] = useState('Masters of Foundation Construction')
  const [logoUrl, setLogoUrl] = useState('')

  // تحميل إعدادات الشركة من قاعدة البيانات
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        console.log('🔄 Loading company settings for sidebar...')
        const settings = await getCachedCompanySettings()
        
        setCompanyName(settings.company_name)
        setCompanySlogan(settings.company_slogan)
        setLogoUrl(settings.company_logo_url || '')
        
        console.log('✅ Company settings loaded for sidebar:', settings)
      } catch (error) {
        console.error('❌ Error loading company settings for sidebar:', error)
        // استخدام القيم الافتراضية في حالة الخطأ
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
        setLogoUrl('')
      }
    }
    
    loadCompanySettings()
  }, [])

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Desktop Toggle Button - When Sidebar is Collapsed */}
      {collapsed && (
        <button
          onClick={() => {
            setCollapsed(false)
            onCollapseChange?.(false)
          }}
          className="hidden lg:flex fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen sidebar-modern transition-all duration-300 z-40',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="py-4 px-4 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}>
          {!collapsed && (
            <div className="flex flex-col items-center gap-3">
              {logoUrl ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="icon-circle cyan flex items-center justify-center shadow-lg" style={{ width: '80px', height: '80px' }}>
                  <LayoutDashboard className="h-10 w-10 text-white" />
                </div>
              )}
              <div className="text-center">
                <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {companyName}
                </h1>
                <p className="text-xs leading-tight mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {companySlogan}
                </p>
              </div>
            </div>
          )}
          
          {/* Toggle Button - Always Visible */}
          <button
            onClick={() => {
              const newCollapsed = !collapsed
              setCollapsed(newCollapsed)
              onCollapseChange?.(newCollapsed)
            }}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors z-10"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* User Profile */}
        {!collapsed && (
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <button
              onClick={onProfileClick}
              className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-600 dark:hover:to-gray-600 transition-all duration-200 cursor-pointer mb-3"
              title="View Profile"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {userRole}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.tab

            // Check permissions for each navigation item
            const hasPermission = () => {
              switch (item.tab) {
                case 'dashboard':
                  return guard.hasAccess('dashboard.view')
                case 'projects':
                  return guard.hasAccess('projects.view')
                case 'boq':
                  return guard.hasAccess('boq.view')
                case 'kpi':
                  return guard.hasAccess('kpi.view')
                case 'reports':
                  return guard.hasAccess('reports.view')
                case 'settings':
                  return guard.hasAccess('settings.view')
                default:
                  return true
              }
            }

            // Don't render if user doesn't have permission
            if (!hasPermission()) {
              return null
            }

            return (
              <button
                key={item.tab}
                onClick={() => {
                  onTabChange(item.tab)
                  setMobileOpen(false)
                }}
                className={cn(
                  'nav-item',
                  isActive ? 'active' : '',
                  collapsed && 'justify-center px-3'
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                )} />
                
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium text-sm">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        isActive 
                          ? 'bg-white/20 text-white'
                          : `${item.badgeColor} text-white`
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* Search (if not collapsed) */}

        {/* Search */}
        {!collapsed && guard.hasAccess('system.search') && (
          <div className="p-4">
            <button
              onClick={() => onTabChange('search')}
              className="nav-item w-full"
            >
              <Search className="h-4 w-4" />
              <span className="font-medium text-sm">Search</span>
              <kbd className="ml-auto px-2 py-1 text-xs bg-white border border-gray-300 rounded">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

      </aside>
    </>
  )
}



'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { UserCard } from '@/components/users/UserCard'
import {
  Users,
  Search,
  Filter,
  Grid,
  List,
  Building,
  Briefcase,
  Mail,
  Phone,
  Download,
  Upload,
  Settings,
  UserPlus,
  Star,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_1?: string
  phone_2?: string
  about?: string
  profile_picture_url?: string
  department_name_en?: string
  department_name_ar?: string
  job_title_en?: string
  job_title_ar?: string
  role: string
  created_at: string
  updated_at: string
}

interface Department {
  id: string
  name_en: string
  name_ar: string
}

interface JobTitle {
  id: string
  title_en: string
  title_ar: string
}

export default function DirectoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  const userCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedJobTitle, setSelectedJobTitle] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'department' | 'role' | 'created'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadUsers()
    loadDepartments()
    loadJobTitles()
  }, [])
  
  // ✅ Scroll to user when user query parameter is present
  useEffect(() => {
    const userId = searchParams?.get('user')
    if (userId && users.length > 0) {
      // Wait a bit for rendering
      setTimeout(() => {
        const userCard = userCardRefs.current.get(userId)
        if (userCard) {
          userCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Highlight the card temporarily
          userCard.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
          setTimeout(() => {
            userCard.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
          }, 3000)
          
          // Remove query parameter from URL
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            url.searchParams.delete('user')
            window.history.replaceState({}, '', url.toString())
          }
        }
      }, 500)
    }
  }, [searchParams, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles_complete')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError
      setUsers(usersData || [])
      
    } catch (error: any) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (deptError) throw deptError
      setDepartments(deptData || [])
    } catch (error: any) {
      console.error('Error loading departments:', error)
    }
  }

  const loadJobTitles = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (jobError) throw jobError
      setJobTitles(jobData || [])
    } catch (error: any) {
      console.error('Error loading job titles:', error)
    }
  }

  const getFilteredUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.job_title_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department_name_en?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDepartment = !selectedDepartment || 
        user.department_name_en === selectedDepartment

      const matchesJobTitle = !selectedJobTitle || 
        user.job_title_en === selectedJobTitle

      const matchesRole = !selectedRole || 
        user.role === selectedRole

      return matchesSearch && matchesDepartment && matchesJobTitle && matchesRole
    })

    // Sort users
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'name':
          aValue = a.full_name
          bValue = b.full_name
          break
        case 'department':
          aValue = a.department_name_en || ''
          bValue = b.department_name_en || ''
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          aValue = a.full_name
          bValue = b.full_name
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }

  const exportUsers = () => {
    const filteredUsers = getFilteredUsers()
    const csvContent = [
      ['Name', 'Email', 'Department', 'Job Title', 'Role', 'Phone', 'Created At'],
      ...filteredUsers.map(user => [
        user.full_name,
        user.email,
        user.department_name_en || '',
        user.job_title_en || '',
        user.role,
        user.phone_1 || '',
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_directory_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStats = () => {
    const total = users.length
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byDepartment = users.reduce((acc, user) => {
      const dept = user.department_name_en || 'Unknown'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, byRole, byDepartment }
  }

  if (loading) {
    return (
      <PermissionPage 
        permission="users.view"
        accessDeniedTitle="Directory Access Required"
        accessDeniedMessage="You need permission to view the directory. Please contact your administrator."
      >
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </PermissionPage>
    )
  }

  if (error) {
    return (
      <PermissionPage 
        permission="users.view"
        accessDeniedTitle="Directory Access Required"
        accessDeniedMessage="You need permission to view the directory. Please contact your administrator."
      >
        <div className="min-h-screen flex items-center justify-center">
          <Alert variant="error">
            <Users className="h-4 w-4" />
            {error}
          </Alert>
        </div>
      </PermissionPage>
    )
  }

  const filteredUsers = getFilteredUsers()
  const stats = getStats()

  return (
    <PermissionPage 
      permission="users.view"
      accessDeniedTitle="Directory Access Required"
      accessDeniedMessage="You need permission to view the directory. Please contact your administrator."
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <DynamicTitle pageTitle="Directory" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                  <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 rounded-2xl shadow-xl">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    User Directory
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                    Discover and connect with your amazing team members
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={exportUsers}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Export Directory</span>
                <span className="sm:hidden">Export</span>
              </Button>
              
              {guard.hasAccess('users.manage') && (
                <Button
                  onClick={() => router.push('/settings?tab=users')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Manage Users</span>
                  <span className="sm:hidden">Manage</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-white/90 text-sm font-medium mb-1">Total Users</p>
                <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.total}</p>
              </div>
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-white/90 text-sm font-medium mb-1">Active</p>
                <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.byRole.engineer || 0}</p>
              </div>
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-white/90 text-sm font-medium mb-1">Departments</p>
                <p className="text-white text-4xl font-bold mb-3 leading-tight">{Object.keys(stats.byDepartment).length}</p>
              </div>
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-white/90 text-sm font-medium mb-1">Job Titles</p>
                <p className="text-white text-4xl font-bold mb-3 leading-tight">{jobTitles.length}</p>
              </div>
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" />
                  Search Team Members
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                  <Input
                    placeholder="Search by name, email, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="relative pl-12 h-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-500" />
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name_en}>
                      {dept.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Title Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-orange-500" />
                  Job Title
                </label>
                <select
                  value={selectedJobTitle}
                  onChange={(e) => setSelectedJobTitle(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="">All Job Titles</option>
                  {jobTitles.map((title) => (
                    <option key={title.id} value={title.title_en}>
                      {title.title_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-500" />
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="engineer">Engineer</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 sm:mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    Sort by:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <option value="name">Name</option>
                    <option value="department">Department</option>
                    <option value="role">Role</option>
                    <option value="created">Created Date</option>
                  </select>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700 hover:scale-105 transition-all duration-200"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className={`h-9 w-9 p-0 transition-all duration-200 ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-md scale-105' : 'hover:scale-105'}`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={`h-9 w-9 p-0 transition-all duration-200 ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-md scale-105' : 'hover:scale-105'}`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  Team Members
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-semibold shadow-sm border border-blue-200/50 dark:border-blue-800/50">
                {filteredUsers.length} of {users.length}
              </div>
            </div>
          </div>
        </div>

        {/* Users Grid/List */}
        {filteredUsers.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative'
              : 'space-y-4 relative'
          } style={{ overflow: 'visible' }}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                ref={(el) => {
                  if (el) userCardRefs.current.set(user.id, el)
                }}
              >
                <UserCard
                  user={user}
                  variant={viewMode === 'list' ? 'detailed' : 'default'}
                  showActions={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-900/50 border-gray-200 dark:border-gray-700">
            <CardContent className="p-16 text-center">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 mx-auto w-fit mb-6">
                <Users className="h-16 w-16 text-blue-500 dark:text-blue-400 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No team members found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6 max-w-md mx-auto">
                Try adjusting your search criteria or filters to discover more team members
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Search className="h-4 w-4" />
                <span>Use the search bar above to find specific members</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </PermissionPage>
  )
}

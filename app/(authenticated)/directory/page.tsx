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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DynamicTitle pageTitle="Directory" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                  User Directory
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 ml-14">
                Discover and connect with your amazing team members
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={exportUsers}
                className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-lg transition-all duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Directory
              </Button>
              
              {guard.hasAccess('users.manage') && (
                <Button
                  onClick={() => router.push('/settings?tab=users')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/30 border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {stats.total}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/30 border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Active</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {stats.byRole.engineer || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/30 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Departments</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {Object.keys(stats.byDepartment).length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/30 border-orange-200 dark:border-orange-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Job Titles</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                      {jobTitles.length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-gray-200/50 dark:bg-gray-800/80 dark:border-gray-700/50 shadow-xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Search Team Members
                </label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search by name, email, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-gray-50/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all duration-200"
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
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Job Title
                </label>
                <select
                  value={selectedJobTitle}
                  onChange={(e) => setSelectedJobTitle(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all duration-200"
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
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full h-12 px-4 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all duration-200"
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
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-700"
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={`h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
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
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Team Members
              </p>
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
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

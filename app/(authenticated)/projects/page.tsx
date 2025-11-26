'use client'

import { ProjectsList } from '@/components/projects/ProjectsList'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { useSearchParams } from 'next/navigation'

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const projectCode = searchParams?.get('project') || ''

  return (
    <PermissionPage 
      permission="projects.view"
      accessDeniedTitle="Projects Access Required"
      accessDeniedMessage="You need permission to view projects. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Projects" />
      <div className="p-6">
        <ProjectsList 
          globalSearchTerm="" 
          globalFilters={{ project: '', status: '', division: '', dateRange: '' }}
          initialProjectCode={projectCode}
        />
      </div>
    </PermissionPage>
  )
}


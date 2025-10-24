'use client'

import { ProjectsList } from '@/components/projects/ProjectsList'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function ProjectsPage() {
  return (
    <PermissionPage 
      permission="projects.view"
      accessDeniedTitle="Projects Access Required"
      accessDeniedMessage="You need permission to view projects. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Projects" />
      <div className="p-6">
        <ProjectsList globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      </div>
    </PermissionPage>
  )
}


'use client'

import { ProjectsList } from '@/components/projects/ProjectsList'

export default function ProjectsPage() {
  return (
    <div className="p-6">
      <ProjectsList globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
    </div>
  )
}


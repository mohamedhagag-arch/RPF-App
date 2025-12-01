const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load environment variables manually
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const envLines = envContent.split('\n')

  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRelationships() {
  console.log('🔍 Checking relationships between Projects, BOQ Activities, and KPI Records...\n')

  try {
    // 1. Check Projects
    console.log('📊 PROJECTS:')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, project_code, project_name, project_status')
      .order('project_code')

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError.message)
      return
    }

    console.log(`✅ Total projects: ${projects.length}`)
    if (projects.length > 0) {
      console.log('📋 Sample projects:')
      projects.slice(0, 3).forEach(project => {
        console.log(`   - ${project.project_code}: ${project.project_name} (${project.project_status})`)
      })
    }
    console.log('')

    // 2. Check BOQ Activities and their relationships
    console.log('📊 BOQ ACTIVITIES:')
    const { data: activities, error: activitiesError } = await supabase
      .from('boq_activities')
      .select('id, project_id, project_code, activity_name, activity_division')
      .order('project_code')

    if (activitiesError) {
      console.error('❌ Error fetching BOQ activities:', activitiesError.message)
      return
    }

    console.log(`✅ Total BOQ activities: ${activities.length}`)
    
    // Check for orphaned activities (activities without valid project_id)
    const projectIds = new Set(projects.map(p => p.id))
    const orphanedActivities = activities.filter(a => !projectIds.has(a.project_id))
    
    if (orphanedActivities.length > 0) {
      console.log(`⚠️  Orphaned activities (no valid project_id): ${orphanedActivities.length}`)
      orphanedActivities.slice(0, 3).forEach(activity => {
        console.log(`   - ${activity.project_code}: ${activity.activity_name}`)
      })
    } else {
      console.log('✅ All activities have valid project relationships')
    }

    // Check project code consistency
    const projectCodeMap = new Map(projects.map(p => [p.project_code, p.id]))
    const inconsistentActivities = activities.filter(a => {
      const expectedProjectId = projectCodeMap.get(a.project_code)
      return expectedProjectId && expectedProjectId !== a.project_id
    })

    if (inconsistentActivities.length > 0) {
      console.log(`⚠️  Activities with inconsistent project codes: ${inconsistentActivities.length}`)
      inconsistentActivities.slice(0, 3).forEach(activity => {
        console.log(`   - ${activity.project_code}: ${activity.activity_name}`)
      })
    } else {
      console.log('✅ All activities have consistent project codes')
    }

    // Group activities by project
    const activitiesByProject = activities.reduce((acc, activity) => {
      if (!acc[activity.project_id]) {
        acc[activity.project_id] = []
      }
      acc[activity.project_id].push(activity)
      return acc
    }, {})

    console.log('📋 Activities per project:')
    Object.entries(activitiesByProject).slice(0, 5).forEach(([projectId, projectActivities]) => {
      const project = projects.find(p => p.id === projectId)
      console.log(`   - ${project?.project_code || 'Unknown'}: ${projectActivities.length} activities`)
    })
    console.log('')

    // 3. Check KPI Records and their relationships
    console.log('📊 KPI RECORDS:')
    const { data: kpis, error: kpisError } = await supabase
      .from('kpi_records')
      .select('id, project_id, activity_id, kpi_name, status')
      .order('created_at', { ascending: false })

    if (kpisError) {
      console.error('❌ Error fetching KPI records:', kpisError.message)
      return
    }

    console.log(`✅ Total KPI records: ${kpis.length}`)

    // Check for orphaned KPIs (KPIs without valid project_id)
    const orphanedKPIs = kpis.filter(k => !projectIds.has(k.project_id))
    
    if (orphanedKPIs.length > 0) {
      console.log(`⚠️  Orphaned KPIs (no valid project_id): ${orphanedKPIs.length}`)
      orphanedKPIs.slice(0, 3).forEach(kpi => {
        console.log(`   - ${kpi.kpi_name} (Project ID: ${kpi.project_id})`)
      })
    } else {
      console.log('✅ All KPIs have valid project relationships')
    }

    // Check for KPIs with invalid activity_id
    const activityIds = new Set(activities.map(a => a.id))
    const kpisWithInvalidActivity = kpis.filter(k => k.activity_id && !activityIds.has(k.activity_id))
    
    if (kpisWithInvalidActivity.length > 0) {
      console.log(`⚠️  KPIs with invalid activity_id: ${kpisWithInvalidActivity.length}`)
      kpisWithInvalidActivity.slice(0, 3).forEach(kpi => {
        console.log(`   - ${kpi.kpi_name} (Activity ID: ${kpi.activity_id})`)
      })
    } else {
      console.log('✅ All KPIs have valid activity relationships')
    }

    // Group KPIs by project and activity
    const kpisByProject = kpis.reduce((acc, kpi) => {
      if (!acc[kpi.project_id]) {
        acc[kpi.project_id] = []
      }
      acc[kpi.project_id].push(kpi)
      return acc
    }, {})

    const kpisByActivity = kpis.reduce((acc, kpi) => {
      if (kpi.activity_id) {
        if (!acc[kpi.activity_id]) {
          acc[kpi.activity_id] = []
        }
        acc[kpi.activity_id].push(kpi)
      }
      return acc
    }, {})

    console.log('📋 KPIs per project:')
    Object.entries(kpisByProject).slice(0, 5).forEach(([projectId, projectKPIs]) => {
      const project = projects.find(p => p.id === projectId)
      console.log(`   - ${project?.project_code || 'Unknown'}: ${projectKPIs.length} KPIs`)
    })

    console.log('📋 KPIs per activity:')
    Object.entries(kpisByActivity).slice(0, 5).forEach(([activityId, activityKPIs]) => {
      const activity = activities.find(a => a.id === activityId)
      console.log(`   - ${activity?.activity_name || 'Unknown'}: ${activityKPIs.length} KPIs`)
    })
    console.log('')

    // 4. Summary and recommendations
    console.log('📊 RELATIONSHIP SUMMARY:')
    console.log('================================')
    
    const totalProjects = projects.length
    const totalActivities = activities.length
    const totalKPIs = kpis.length
    
    console.log(`📁 Projects: ${totalProjects}`)
    console.log(`🔧 BOQ Activities: ${totalActivities}`)
    console.log(`📈 KPI Records: ${totalKPIs}`)
    console.log('')
    
    console.log('🔗 Relationship Health:')
    console.log(`   - Activities with valid projects: ${totalActivities - orphanedActivities.length}/${totalActivities}`)
    console.log(`   - KPIs with valid projects: ${totalKPIs - orphanedKPIs.length}/${totalKPIs}`)
    console.log(`   - KPIs with valid activities: ${totalKPIs - kpisWithInvalidActivity.length}/${totalKPIs}`)
    console.log('')
    
    // Calculate coverage
    const projectsWithActivities = Object.keys(activitiesByProject).length
    const projectsWithKPIs = Object.keys(kpisByProject).length
    const activitiesWithKPIs = Object.keys(kpisByActivity).length
    
    console.log('📊 Coverage Analysis:')
    console.log(`   - Projects with activities: ${projectsWithActivities}/${totalProjects} (${Math.round(projectsWithActivities/totalProjects*100)}%)`)
    console.log(`   - Projects with KPIs: ${projectsWithKPIs}/${totalProjects} (${Math.round(projectsWithKPIs/totalProjects*100)}%)`)
    console.log(`   - Activities with KPIs: ${activitiesWithKPIs}/${totalActivities} (${Math.round(activitiesWithKPIs/totalActivities*100)}%)`)
    console.log('')
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:')
    if (orphanedActivities.length > 0) {
      console.log('   ⚠️  Fix orphaned activities by updating project_id or creating missing projects')
    }
    if (orphanedKPIs.length > 0) {
      console.log('   ⚠️  Fix orphaned KPIs by updating project_id or creating missing projects')
    }
    if (kpisWithInvalidActivity.length > 0) {
      console.log('   ⚠️  Fix KPIs with invalid activity_id by updating or removing invalid references')
    }
    if (projectsWithActivities < totalProjects) {
      console.log('   💡 Consider adding activities to projects without any')
    }
    if (projectsWithKPIs < totalProjects) {
      console.log('   💡 Consider adding KPIs to projects without any')
    }
    if (activitiesWithKPIs < totalActivities) {
      console.log('   💡 Consider adding KPIs to activities without any')
    }
    
    if (orphanedActivities.length === 0 && orphanedKPIs.length === 0 && kpisWithInvalidActivity.length === 0) {
      console.log('   ✅ All relationships are healthy!')
    }

  } catch (error) {
    console.error('❌ Error checking relationships:', error)
  }
}

checkRelationships().catch(console.error)



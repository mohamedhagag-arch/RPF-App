/**
 * Run Auto Calculations Script
 * 
 * This script runs the auto-calculation system to update all existing data
 * with the new rate-based calculations
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runAutoCalculations() {
  console.log('🚀 Starting auto-calculations for all data...')
  
  try {
    // Get all BOQ activities
    console.log('📊 Fetching all BOQ activities...')
    const { data: activities, error: activitiesError } = await supabase
      .from('boq_activities')
      .select('*')
    
    if (activitiesError) {
      console.error('❌ Failed to fetch activities:', activitiesError)
      return
    }
    
    console.log(`✅ Found ${activities.length} activities`)
    
    // Process each activity
    let updatedCount = 0
    let errorCount = 0
    
    for (const activity of activities) {
      try {
        console.log(`🔄 Processing activity: ${activity.Activity}`)
        
        // Calculate rate
        const plannedUnits = parseFloat(activity['Planned Units'] || '0')
        const totalValue = parseFloat(activity['Total Value'] || '0')
        const actualUnits = parseFloat(activity['Actual Units'] || '0')
        
        const rate = plannedUnits > 0 ? totalValue / plannedUnits : 0
        const progressPercentage = plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : 0
        const earnedValue = rate * actualUnits
        const actualValue = earnedValue
        const plannedValue = totalValue
        const remainingValue = rate * (plannedUnits - actualUnits)
        
        // Update the activity
        const { error: updateError } = await supabase
          .from('boq_activities')
          .update({
            rate: rate,
            progress_percentage: progressPercentage,
            earned_value: earnedValue,
            actual_value: actualValue,
            planned_value: plannedValue,
            remaining_value: remainingValue,
            last_calculated_at: new Date().toISOString()
          })
          .eq('id', activity.id)
        
        if (updateError) {
          console.error(`❌ Failed to update activity ${activity.Activity}:`, updateError)
          errorCount++
        } else {
          console.log(`✅ Updated activity: ${activity.Activity} (Rate: $${rate.toFixed(2)}, Progress: ${progressPercentage.toFixed(1)}%)`)
          updatedCount++
        }
        
      } catch (error) {
        console.error(`❌ Error processing activity ${activity.Activity}:`, error)
        errorCount++
      }
    }
    
    // Update projects
    console.log('📊 Updating project calculations...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('project_code')
    
    if (projectsError) {
      console.error('❌ Failed to fetch projects:', projectsError)
      return
    }
    
    let updatedProjects = 0
    
    for (const project of projects) {
      try {
        // Get all activities for this project
        const { data: projectActivities, error: projectActivitiesError } = await supabase
          .from('boq_activities')
          .select('*')
          .eq('Project Code', project.project_code)
        
        if (projectActivitiesError) {
          console.error(`❌ Failed to fetch activities for project ${project.project_code}:`, projectActivitiesError)
          continue
        }
        
        // Calculate project totals
        let totalPlannedValue = 0
        let totalEarnedValue = 0
        let totalProgress = 0
        let activitiesCount = 0
        
        for (const activity of projectActivities) {
          const plannedUnits = parseFloat(activity['Planned Units'] || '0')
          const totalValue = parseFloat(activity['Total Value'] || '0')
          const actualUnits = parseFloat(activity['Actual Units'] || '0')
          
          const rate = plannedUnits > 0 ? totalValue / plannedUnits : 0
          const earnedValue = rate * actualUnits
          const progress = plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : 0
          
          totalPlannedValue += totalValue
          totalEarnedValue += earnedValue
          totalProgress += progress
          activitiesCount++
        }
        
        const averageProgress = activitiesCount > 0 ? totalProgress / activitiesCount : 0
        const schedulePerformanceIndex = totalPlannedValue > 0 ? totalEarnedValue / totalPlannedValue : 0
        const costPerformanceIndex = schedulePerformanceIndex
        
        // Update the project
        const { error: projectUpdateError } = await supabase
          .from('projects')
          .update({
            total_planned_value: totalPlannedValue,
            total_earned_value: totalEarnedValue,
            overall_progress: averageProgress,
            schedule_performance_index: schedulePerformanceIndex,
            cost_performance_index: costPerformanceIndex,
            last_calculated_at: new Date().toISOString()
          })
          .eq('project_code', project.project_code)
        
        if (projectUpdateError) {
          console.error(`❌ Failed to update project ${project.project_code}:`, projectUpdateError)
        } else {
          console.log(`✅ Updated project: ${project.project_code} (Total Value: $${totalPlannedValue.toFixed(2)}, Progress: ${averageProgress.toFixed(1)}%)`)
          updatedProjects++
        }
        
      } catch (error) {
        console.error(`❌ Error processing project ${project.project_code}:`, error)
      }
    }
    
    console.log('\n🎉 Auto-calculations completed!')
    console.log(`✅ Updated ${updatedCount} activities`)
    console.log(`✅ Updated ${updatedProjects} projects`)
    console.log(`❌ ${errorCount} errors`)
    
  } catch (error) {
    console.error('❌ Auto-calculations failed:', error)
  }
}

// Run the script
runAutoCalculations()
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

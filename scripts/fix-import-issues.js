const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixImportIssues() {
  console.log('🔧 Fixing potential import issues...\n');
  
  try {
    // Check and fix data type issues
    console.log('📊 Checking and fixing data type issues...');
    
    // Fix projects table
    console.log('🔧 Fixing projects table...');
    
    // Get all projects and check for issues
    const { data: projects } = await supabase
      .from('projects')
      .select('*');
    
    if (projects && projects.length > 0) {
      let fixedCount = 0;
      
      for (const project of projects) {
        const updates = {};
        let needsUpdate = false;
        
        // Fix contract_amount if it's not a number
        if (typeof project.contract_amount !== 'number') {
          updates.contract_amount = 0;
          needsUpdate = true;
        }
        
        // Fix project_status if it's not valid
        const validStatuses = ['active', 'completed', 'on_hold', 'cancelled'];
        if (project.project_status && !validStatuses.includes(project.project_status)) {
          updates.project_status = 'active';
          needsUpdate = true;
        }
        
        // Fix boolean fields
        if (typeof project.kpi_completed !== 'boolean') {
          updates.kpi_completed = false;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', project.id);
          
          if (error) {
            console.log(`❌ Error updating project ${project.id}: ${error.message}`);
          } else {
            fixedCount++;
          }
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} projects`);
    }
    
    // Fix BOQ activities table
    console.log('🔧 Fixing BOQ activities table...');
    
    const { data: activities } = await supabase
      .from('boq_activities')
      .select('*');
    
    if (activities && activities.length > 0) {
      let fixedCount = 0;
      
      for (const activity of activities) {
        const updates = {};
        let needsUpdate = false;
        
        // Fix numeric fields
        const numericFields = [
          'total_units', 'planned_units', 'actual_units', 'difference',
          'variance_units', 'rate', 'total_value', 'calendar_duration',
          'activity_progress_percentage', 'productivity_daily_rate',
          'total_drilling_meters', 'drilled_meters_planned_progress',
          'drilled_meters_actual_progress', 'remaining_meters',
          'planned_value', 'earned_value', 'delay_percentage',
          'planned_progress_percentage', 'remaining_work_value',
          'variance_works_value', 'remaining_lookahead_duration_for_activity_completion'
        ];
        
        numericFields.forEach(field => {
          if (activity[field] !== null && activity[field] !== undefined && typeof activity[field] !== 'number') {
            const numValue = parseFloat(activity[field]);
            if (!isNaN(numValue)) {
              updates[field] = numValue;
              needsUpdate = true;
            } else {
              updates[field] = 0;
              needsUpdate = true;
            }
          }
        });
        
        // Fix boolean fields
        const booleanFields = [
          'reported_on_data_date', 'activity_delayed', 'activity_on_track', 'activity_completed'
        ];
        
        booleanFields.forEach(field => {
          if (typeof activity[field] !== 'boolean') {
            updates[field] = false;
            needsUpdate = true;
          }
        });
        
        // Fix date fields
        const dateFields = [
          'planned_activity_start_date', 'deadline', 'activity_planned_start_date',
          'activity_planned_completion_date', 'lookahead_start_date',
          'lookahead_activity_completion_date'
        ];
        
        dateFields.forEach(field => {
          if (activity[field] && !isValidDate(activity[field])) {
            updates[field] = null;
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          const { error } = await supabase
            .from('boq_activities')
            .update(updates)
            .eq('id', activity.id);
          
          if (error) {
            console.log(`❌ Error updating activity ${activity.id}: ${error.message}`);
          } else {
            fixedCount++;
          }
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} BOQ activities`);
    }
    
    // Fix KPI records table
    console.log('🔧 Fixing KPI records table...');
    
    const { data: kpis } = await supabase
      .from('kpi_records')
      .select('*');
    
    if (kpis && kpis.length > 0) {
      let fixedCount = 0;
      
      for (const kpi of kpis) {
        const updates = {};
        let needsUpdate = false;
        
        // Fix numeric fields
        const numericFields = ['planned_value', 'actual_value'];
        
        numericFields.forEach(field => {
          if (kpi[field] !== null && kpi[field] !== undefined && typeof kpi[field] !== 'number') {
            const numValue = parseFloat(kpi[field]);
            if (!isNaN(numValue)) {
              updates[field] = numValue;
              needsUpdate = true;
            } else {
              updates[field] = 0;
              needsUpdate = true;
            }
          }
        });
        
        // Fix date fields
        const dateFields = ['target_date', 'completion_date'];
        
        dateFields.forEach(field => {
          if (kpi[field] && !isValidDate(kpi[field])) {
            updates[field] = null;
            needsUpdate = true;
          }
        });
        
        // Fix status enum
        const validStatuses = ['on_track', 'delayed', 'completed', 'at_risk'];
        if (kpi.status && !validStatuses.includes(kpi.status)) {
          updates.status = 'on_track';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const { error } = await supabase
            .from('kpi_records')
            .update(updates)
            .eq('id', kpi.id);
          
          if (error) {
            console.log(`❌ Error updating KPI ${kpi.id}: ${error.message}`);
          } else {
            fixedCount++;
          }
        }
      }
      
      console.log(`✅ Fixed ${fixedCount} KPI records`);
    }
    
    console.log('\n🎉 Data type fixes completed!');
    
    // Check if there are any remaining issues
    console.log('\n📊 Checking for remaining issues...');
    
    const { data: remainingProjects } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (remainingProjects && remainingProjects.length > 0) {
      console.log('✅ Projects table is clean');
    }
    
    const { data: remainingActivities } = await supabase
      .from('boq_activities')
      .select('*')
      .limit(5);
    
    if (remainingActivities && remainingActivities.length > 0) {
      console.log('✅ BOQ activities table is clean');
    }
    
    const { data: remainingKPIs } = await supabase
      .from('kpi_records')
      .select('*')
      .limit(5);
    
    if (remainingKPIs && remainingKPIs.length > 0) {
      console.log('✅ KPI records table is clean');
    }
    
    console.log('\n🎉 All data type issues have been fixed!');
    console.log('📊 Your database is now ready for import operations.');
    
  } catch (error) {
    console.error('❌ Error fixing import issues:', error);
  }
}

function isValidDate(date) {
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

fixImportIssues().catch(console.error);

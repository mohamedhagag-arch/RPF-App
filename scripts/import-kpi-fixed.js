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

async function importKPIFixed() {
  console.log('📈 Importing KPI records with fixed CSV parsing...\n');
  
  try {
    // Clear existing KPI records
    console.log('🗑️ Clearing existing KPI records...');
    
    const { error: deleteError } = await supabase
      .from('kpi_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.log(`❌ Error clearing KPI records: ${deleteError.message}`);
    } else {
      console.log('✅ Existing KPI records cleared');
    }
    
    // Import KPI records
    console.log('📈 Importing KPI records...');
    const kpisImported = await importKPIRecords();
    console.log(`✅ Imported ${kpisImported} KPI records`);
    
    // Verify the import
    console.log('\n📊 Verifying the import...');
    
    const { count: kpiCount } = await supabase
      .from('kpi_records')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🎉 KPI import completed!`);
    console.log(`📊 Final KPI Records: ${kpiCount}`);
    
  } catch (error) {
    console.error('❌ Error importing KPI records:', error);
  }
}

// Helper function to clean and format data
function cleanValue(value, type = 'string') {
  if (!value || value === '' || value === 'null' || value === 'undefined' || value === '#DIV/0!' || value === '#ERROR!') {
    return null;
  }
  
  switch (type) {
    case 'number':
      const numValue = value.replace(/[AED$,]/g, '').replace(/,/g, '');
      const parsed = parseFloat(numValue);
      return isNaN(parsed) ? 0 : parsed;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'date':
      if (value === 'Dec 30, 1899' || value === '#DIV/0!' || value === '' || value === 'null' || value === '#ERROR!') {
        return null;
      }
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    case 'percentage':
      const percentValue = value.replace('%', '').replace('#DIV/0!', '0');
      const percent = parseFloat(percentValue);
      return isNaN(percent) ? 0 : percent;
    default:
      return value;
  }
}

// Improved CSV parser that handles commas in quoted fields
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
  }
  
  return data;
}

// Parse a single CSV line, handling quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Import KPI Records
async function importKPIRecords() {
  try {
    const csvPath = path.join(__dirname, '../Database/Planning Database - KPI.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const kpis = parseCSV(csvContent);
    
    console.log(`📊 Found ${kpis.length} KPI records in CSV`);
    
    // Get all projects to map project codes to IDs
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_code');
    
    const projectMap = {};
    projects?.forEach(project => {
      projectMap[project.project_code] = project.id;
    });
    
    console.log(`📊 Found ${Object.keys(projectMap).length} projects for mapping`);
    
    // Get all activities to map activity names to IDs
    const { data: activities } = await supabase
      .from('boq_activities')
      .select('id, project_code, activity_name');
    
    const activityMap = {};
    activities?.forEach(activity => {
      const key = `${activity.project_code}-${activity.activity_name}`;
      activityMap[key] = activity.id;
    });
    
    console.log(`📊 Found ${Object.keys(activityMap).length} activities for mapping`);
    
    const formattedKPIs = kpis.map(kpi => {
      const projectCode = kpi['Project Full Code'];
      const projectId = projectMap[projectCode];
      const activityKey = `${projectCode}-${kpi['Activity Name']}`;
      const activityId = activityMap[activityKey];
      
      if (!projectId) return null;
      
      if (!kpi['Activity Name'] || kpi['Activity Name'] === '') {
        return null;
      }
      
      const plannedDate = cleanValue(kpi['Planned Date'], 'date');
      const actualDate = cleanValue(kpi['Actual Date'], 'date');
      const targetDate = plannedDate || actualDate || new Date().toISOString().split('T')[0];
      
      return {
        project_id: projectId,
        activity_id: activityId,
        kpi_name: cleanValue(kpi['Activity Name']) || 'Progress Tracking',
        planned_value: cleanValue(kpi['Quantity'], 'number') || 0,
        actual_value: cleanValue(kpi['Quantity'], 'number') || 0,
        target_date: targetDate,
        completion_date: actualDate,
        status: kpi['Input Type'] === 'Actual' ? 'completed' : 'on_track',
        notes: `Imported from KPI data - Section: ${cleanValue(kpi['Section']) || 'N/A'}`,
      };
    }).filter(kpi => kpi && kpi.project_id && kpi.kpi_name);
    
    console.log(`📊 Formatted ${formattedKPIs.length} valid KPI records`);
    
    // Insert KPIs in smaller batches to avoid timeouts
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < formattedKPIs.length; i += batchSize) {
      const batch = formattedKPIs.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('kpi_records')
          .insert(batch);
        
        if (error) {
          console.error(`❌ Error inserting KPIs batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`✅ Inserted KPIs batch ${Math.floor(i/batchSize) + 1} (${batch.length} KPIs)`);
        }
      } catch (error) {
        console.error(`❌ Error inserting KPIs batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        errorCount += batch.length;
      }
      
      // Add a small delay to avoid overwhelming the database
      if (i % 1000 === 0 && i > 0) {
        console.log(`⏳ Processed ${i} records, taking a short break...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`📊 KPI Import Summary: ${successCount} successful, ${errorCount} failed`);
    return successCount;
  } catch (error) {
    console.error('❌ Error importing KPI records:', error);
    return 0;
  }
}

// Run the import
importKPIFixed().catch(console.error);

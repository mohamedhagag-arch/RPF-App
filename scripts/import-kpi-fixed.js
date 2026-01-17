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
      // ✅ Enhanced date parsing for DATE type column - handles multiple formats
      if (value === 'Dec 30, 1899' || value === '#DIV/0!' || value === '' || value === 'null' || value === 'N/A' || value === '#ERROR!') {
        return '2025-12-31'; // Default date for NULL values (DATE type requires non-null)
      }
      
      const dateStr = String(value).trim();
      
      // Format 1: Already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(dateStr)) {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const [, year, month, day] = match;
          const yearNum = parseInt(year, 10);
          if (yearNum >= 1900 && yearNum <= 2100) {
            return `${year}-${month}-${day}`;
          }
        }
      }
      
      // Format 2: YYYYMMDD (8 digits)
      if (/^\d{8}$/.test(dateStr)) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const yearNum = parseInt(year, 10);
        if (yearNum >= 1900 && yearNum <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
      
      // Format 3: MM/DD/YYYY or M/D/YYYY
      const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyyMatch) {
        const [, month, day, year] = mmddyyyyMatch;
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
          return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        }
      }
      
      // Format 4: DD-MMM-YY (e.g., "6-Jan-25")
      const ddmmyyMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
      if (ddmmyyMatch) {
        const [, day, monthStr, yearStr] = ddmmyyMatch;
        const monthMap = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[monthStr];
        const year = '20' + yearStr;
        if (month) {
          return `${year}-${month}-${String(parseInt(day, 10)).padStart(2, '0')}`;
        }
      }
      
      // Format 5: Excel serial date (numeric)
      const numValue = parseFloat(dateStr);
      if (!isNaN(numValue) && numValue > 0 && numValue < 1000000 && 
          !dateStr.includes('/') && !dateStr.includes('-') && !dateStr.includes('T')) {
        try {
          let days = Math.floor(numValue);
          const isAfterFeb28_1900 = days > 59;
          if (isAfterFeb28_1900) days = days - 1;
          const epoch = new Date(1899, 11, 30);
          const dateObj = new Date(epoch.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
          if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() >= 1900 && dateObj.getFullYear() <= 2100) {
            return dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          // Fall through
        }
      }
      
      // Format 6: Try JavaScript Date parsing as fallback
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Fall through to default
      }
      
      // Default: return default date if all parsing fails
      return '2025-12-31';
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
      
      // Map to Activity Date (unified field) - DATE type requires YYYY-MM-DD format
      const activityDate = cleanValue(kpi['Activity Date'] || kpi['Actual Date'] || kpi['Target Date'] || kpi['Planned Date'], 'date') || '2025-12-31';
      
      return {
        project_id: projectId,
        activity_id: activityId,
        kpi_name: cleanValue(kpi['Activity Name']) || 'Progress Tracking',
        planned_value: cleanValue(kpi['Quantity'], 'number') || 0,
        actual_value: cleanValue(kpi['Quantity'], 'number') || 0,
        activity_date: activityDate, // ✅ Use Activity Date (unified field)
        completion_date: activityDate, // ✅ Use Activity Date for completion
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

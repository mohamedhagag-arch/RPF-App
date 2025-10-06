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

async function checkTableStructure() {
  console.log('🔍 Checking table structure for data import compatibility...\n');
  
  try {
    // Check each table structure
    const tables = ['users', 'projects', 'boq_activities', 'kpi_records'];
    
    for (const table of tables) {
      console.log(`📊 Checking table: ${table}`);
      
      // Get sample data to see the structure
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Error accessing table ${table}: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        const sampleRecord = data[0];
        console.log(`✅ Table ${table} structure:`);
        
        // Show each column with its type
        Object.entries(sampleRecord).forEach(([key, value]) => {
          const valueType = typeof value;
          const isNull = value === null;
          const isDate = value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
          
          let typeInfo = valueType;
          if (isNull) typeInfo += ' (null)';
          if (isDate) typeInfo += ' (date)';
          if (typeof value === 'number') typeInfo += ` (${value})`;
          if (typeof value === 'string' && value.length > 50) typeInfo += ` (long text: ${value.length} chars)`;
          
          console.log(`   - ${key}: ${typeInfo}`);
        });
        
        // Check for potential issues
        const issues = [];
        
        // Check for UUID fields
        const uuidFields = ['id', 'project_id', 'activity_id', 'created_by'];
        uuidFields.forEach(field => {
          if (sampleRecord[field] && !isValidUUID(sampleRecord[field])) {
            issues.push(`${field} is not a valid UUID`);
          }
        });
        
        // Check for date fields
        const dateFields = ['created_at', 'updated_at', 'planned_activity_start_date', 'deadline', 'target_date', 'completion_date'];
        dateFields.forEach(field => {
          if (sampleRecord[field] && !isValidDate(sampleRecord[field])) {
            issues.push(`${field} is not a valid date`);
          }
        });
        
        // Check for numeric fields
        const numericFields = ['total_units', 'planned_units', 'actual_units', 'rate', 'total_value', 'contract_amount'];
        numericFields.forEach(field => {
          if (sampleRecord[field] !== null && sampleRecord[field] !== undefined && typeof sampleRecord[field] !== 'number') {
            issues.push(`${field} is not a valid number`);
          }
        });
        
        if (issues.length > 0) {
          console.log(`   ❌ Issues found:`);
          issues.forEach(issue => console.log(`      - ${issue}`));
        } else {
          console.log(`   ✅ No structural issues found`);
        }
        
      } else {
        console.log(`⚠️ No data in table ${table} to check structure`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Check for common import issues
    console.log('📊 Checking for common import issues...');
    
    // Check if there are any constraints that might cause issues
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_code, project_name')
      .limit(5);
    
    if (projects && projects.length > 0) {
      console.log('✅ Projects table has valid data structure');
      
      // Check for duplicate project codes
      const projectCodes = projects.map(p => p.project_code);
      const uniqueCodes = [...new Set(projectCodes)];
      
      if (projectCodes.length !== uniqueCodes.length) {
        console.log('❌ Duplicate project codes found');
      } else {
        console.log('✅ No duplicate project codes');
      }
    }
    
    console.log('\n🎉 Table structure check completed!');
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  }
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidDate(date) {
  if (date instanceof Date) return !isNaN(date.getTime());
  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
}

checkTableStructure().catch(console.error);

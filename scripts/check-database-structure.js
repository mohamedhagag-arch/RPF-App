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

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure in Supabase...\n');
  
  try {
    // Check if all tables exist
    const tables = ['users', 'projects', 'boq_activities', 'kpi_records'];
    
    for (const table of tables) {
      console.log(`📊 Checking table: ${table}`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table} does not exist or has issues: ${error.message}`);
      } else {
        console.log(`✅ Table ${table} exists and is accessible`);
        
        // Get table info
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`   - Records count: ${count}`);
      }
    }
    
    // Check for custom types
    console.log('\n📊 Checking custom types...');
    
    const { data: types, error: typesError } = await supabase
      .rpc('get_custom_types');
    
    if (typesError) {
      console.log('⚠️ Could not check custom types (this is normal)');
    } else {
      console.log('✅ Custom types found:', types);
    }
    
    // Check for indexes
    console.log('\n📊 Checking indexes...');
    
    const { data: indexes, error: indexesError } = await supabase
      .rpc('get_table_indexes');
    
    if (indexesError) {
      console.log('⚠️ Could not check indexes (this is normal)');
    } else {
      console.log('✅ Indexes found:', indexes);
    }
    
    // Check for RLS policies
    console.log('\n📊 Checking RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policies');
    
    if (policiesError) {
      console.log('⚠️ Could not check RLS policies (this is normal)');
    } else {
      console.log('✅ RLS policies found:', policies);
    }
    
    console.log('\n🎉 Database structure check completed!');
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  }
}

checkDatabaseStructure().catch(console.error);

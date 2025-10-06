#!/usr/bin/env node

// Script to check the structure of planning schema tables
require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'planning'
  }
});

async function checkPlanningSchema() {
  console.log('🔍 Checking Planning Schema Tables...\n');
  
  const tables = [
    'Planning Database - ProjectsList',
    'Planning Database - BOQ Rates',
    'Planning Database - KPI'
  ];
  
  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`);
    console.log('='.repeat(50));
    
    try {
      // Get sample data
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
        continue;
      }
      
      console.log(`✅ Total Records: ${count}`);
      
      if (data && data.length > 0) {
        console.log('\n📋 Column Names:');
        const columns = Object.keys(data[0]);
        columns.forEach((col, idx) => {
          console.log(`   ${idx + 1}. ${col}`);
        });
        
        console.log('\n📝 Sample Data (first record):');
        console.log(JSON.stringify(data[0], null, 2));
      }
      
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n\n✅ Schema check completed!');
}

checkPlanningSchema().catch(console.error);


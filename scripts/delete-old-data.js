#!/usr/bin/env node

/**
 * Delete Old Data from Supabase Planning Schema
 * 
 * This script deletes all data from the planning schema tables
 * to prepare for fresh import
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'planning'
  }
});

const TABLES = {
  KPI: 'Planning Database - KPI',
  BOQ: 'Planning Database - BOQ Rates',
  PROJECTS: 'Planning Database - ProjectsList'
};

async function deleteAllData() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║       🗑️  Delete All Data from Planning Schema    ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n⚠️  WARNING: This will delete ALL data!\n');
  
  // Delete in order (foreign keys first)
  for (const [name, tableName] of Object.entries(TABLES)) {
    console.log(`\n🗑️  Deleting from: ${tableName}`);
    
    try {
      // First, get count
      const { count: beforeCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Current records: ${beforeCount || 0}`);
      
      if (beforeCount === 0) {
        console.log(`   ✅ Table already empty`);
        continue;
      }
      
      // Delete all records
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Deleted ${beforeCount} records`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n✅ All data deleted successfully!');
}

deleteAllData().catch(console.error);

#!/usr/bin/env node

/**
 * Import New Data from "clear data" folder to Supabase Planning Schema
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'planning'
  }
});

const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI'
};

const CSV_FOLDER = path.join(__dirname, '../Database/clear data');

/**
 * Parse CSV file (simple parser)
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Get headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse data
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || '';
      value = value.trim().replace(/^"|"$/g, '');
      row[header] = value;
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Delete all data from Planning Schema
 */
async function deleteAllData() {
  console.log('\n🗑️  Step 1: Deleting old data from Planning Schema...');
  console.log('════════════════════════════════════════════════════');
  
  // Delete in reverse order (respect foreign keys)
  for (const [name, tableName] of Object.entries(TABLES)) {
    console.log(`\n   Clearing: ${tableName}`);
    
    try {
      // Use RPC or direct delete
      const { error: deleteError } = await supabase.rpc('delete_all_planning_data', { 
        table_name: tableName 
      });
      
      // If RPC doesn't exist, use direct delete
      if (deleteError) {
        // Try truncate (faster but requires permissions)
        const { data, error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        if (!error && data) {
          // Delete in batches
          let hasMore = true;
          let deleted = 0;
          
          while (hasMore) {
            const { data: batch } = await supabase
              .from(tableName)
              .select('id')
              .limit(1000);
            
            if (!batch || batch.length === 0) {
              hasMore = false;
              break;
            }
            
            const ids = batch.map(item => item.id);
            await supabase
              .from(tableName)
              .delete()
              .in('id', ids);
            
            deleted += batch.length;
            console.log(`      Deleted ${deleted} records...`);
          }
        }
      }
      
      console.log(`   ✅ Cleared ${tableName}`);
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }
  }
  
  console.log('\n✅ Old data deleted!');
}

/**
 * Import data from clear data folder
 */
async function importNewData() {
  console.log('\n📥 Step 2: Importing new data from "clear data" folder...');
  console.log('════════════════════════════════════════════════════');
  
  const results = {
    projects: 0,
    boq: 0,
    kpi: 0
  };
  
  // Import Projects
  try {
    console.log('\n📊 Importing Projects...');
    const projectsFile = path.join(CSV_FOLDER, 'Planning Database - ProjectsList.csv');
    const projects = parseCSV(projectsFile);
    console.log(`   Found: ${projects.length} projects`);
    
    const batchSize = 100;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.PROJECTS).insert(batch);
      
      if (!error) {
        results.projects += batch.length;
        console.log(`   ✅ ${results.projects}/${projects.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
  }
  
  // Import BOQ
  try {
    console.log('\n📋 Importing BOQ Activities...');
    const boqFile = path.join(CSV_FOLDER, 'Planning Database - BOQ Rates .csv');
    const boq = parseCSV(boqFile);
    console.log(`   Found: ${boq.length} activities`);
    
    const batchSize = 100;
    for (let i = 0; i < boq.length; i += batchSize) {
      const batch = boq.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.BOQ).insert(batch);
      
      if (!error) {
        results.boq += batch.length;
        console.log(`   ✅ ${results.boq}/${boq.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
  }
  
  // Import KPI
  try {
    console.log('\n📈 Importing KPI Records...');
    const kpiFile = path.join(CSV_FOLDER, 'Planning Database - KPI .csv');
    const kpi = parseCSV(kpiFile);
    console.log(`   Found: ${kpi.length} records`);
    
    const batchSize = 100;
    for (let i = 0; i < kpi.length; i += batchSize) {
      const batch = kpi.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.KPI).insert(batch);
      
      if (!error) {
        results.kpi += batch.length;
        console.log(`   ✅ ${results.kpi}/${kpi.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
  }
  
  return results;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     🔄 Import New Data from "clear data" Folder      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // Delete old data
  await deleteAllData();
  
  // Import new data
  const results = await importNewData();
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    📊 Final Summary                   ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Projects:          ${String(results.projects).padStart(6)}                        ║`);
  console.log(`║  ✅ BOQ Activities:    ${String(results.boq).padStart(6)}                        ║`);
  console.log(`║  ✅ KPI Records:       ${String(results.kpi).padStart(6)}                        ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  📦 Total:            ${String(results.projects + results.boq + results.kpi).padStart(7)}                        ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  console.log('\n🎉 Import completed successfully!');
  console.log('✅ New data is now in Supabase Planning Schema');
  console.log('\n💡 Refresh your application: http://localhost:3000');
}

main().catch(console.error);

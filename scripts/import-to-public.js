#!/usr/bin/env node

/**
 * Import Data from "clear data" folder to Supabase Public Schema
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local!');
  console.error('Make sure you have:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = {
  PROJECTS: 'Planning Database - ProjectsList',
  BOQ: 'Planning Database - BOQ Rates',
  KPI: 'Planning Database - KPI'
};

const CSV_FOLDER = path.join(__dirname, '../Database/clear data');

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  // Parse headers (handle quotes and commas properly)
  const headerLine = lines[0];
  const headers = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim().replace(/^"|"$/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    current = '';
    inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Delete all data from tables
 */
async function deleteAllData() {
  console.log('\n🗑️  Step 1: Deleting old data...');
  console.log('════════════════════════════════════════');
  
  for (const [name, tableName] of Object.entries(TABLES)) {
    console.log(`\n   Clearing: ${tableName}`);
    
    try {
      const { count: beforeCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Current records: ${beforeCount || 0}`);
      
      if (beforeCount > 0) {
        // Delete in batches
        let deleted = 0;
        while (deleted < beforeCount) {
          const { data: batch } = await supabase
            .from(tableName)
            .select('id')
            .limit(1000);
          
          if (!batch || batch.length === 0) break;
          
          const ids = batch.map(item => item.id);
          await supabase
            .from(tableName)
            .delete()
            .in('id', ids);
          
          deleted += batch.length;
          console.log(`      Deleted ${deleted}/${beforeCount}...`);
        }
        console.log(`   ✅ Deleted ${beforeCount} records`);
      } else {
        console.log(`   ✅ Table already empty`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }
  }
  
  console.log('\n✅ Old data deleted!');
}

/**
 * Import Projects
 */
async function importProjects() {
  console.log('\n📊 Importing Projects...');
  
  try {
    const filePath = path.join(CSV_FOLDER, 'Planning Database - ProjectsList.csv');
    const data = parseCSV(filePath);
    console.log(`   Found: ${data.length} projects`);
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.PROJECTS).insert(batch);
      
      if (!error) {
        imported += batch.length;
        console.log(`   ✅ ${imported}/${data.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
    
    return imported;
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
    return 0;
  }
}

/**
 * Import BOQ
 */
async function importBOQ() {
  console.log('\n📋 Importing BOQ Activities...');
  
  try {
    const filePath = path.join(CSV_FOLDER, 'Planning Database - BOQ Rates .csv');
    const data = parseCSV(filePath);
    console.log(`   Found: ${data.length} activities`);
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.BOQ).insert(batch);
      
      if (!error) {
        imported += batch.length;
        console.log(`   ✅ ${imported}/${data.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
    
    return imported;
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
    return 0;
  }
}

/**
 * Import KPI
 */
async function importKPI() {
  console.log('\n📈 Importing KPI Records...');
  
  try {
    const filePath = path.join(CSV_FOLDER, 'Planning Database - KPI .csv');
    const data = parseCSV(filePath);
    console.log(`   Found: ${data.length} records`);
    
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error } = await supabase.from(TABLES.KPI).insert(batch);
      
      if (!error) {
        imported += batch.length;
        console.log(`   ✅ ${imported}/${data.length}`);
      } else {
        console.error(`   ⚠️  Error: ${error.message}`);
      }
    }
    
    return imported;
  } catch (error) {
    console.error(`   ❌ ${error.message}`);
    return 0;
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     📥 Import New Data to Public Schema              ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // Delete old data
  await deleteAllData();
  
  // Import new data
  console.log('\n📥 Step 2: Importing new data...');
  console.log('════════════════════════════════════════');
  
  const projectsCount = await importProjects();
  const boqCount = await importBOQ();
  const kpiCount = await importKPI();
  
  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    📊 Final Summary                   ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Projects:          ${String(projectsCount).padStart(6)}                        ║`);
  console.log(`║  ✅ BOQ Activities:    ${String(boqCount).padStart(6)}                        ║`);
  console.log(`║  ✅ KPI Records:       ${String(kpiCount).padStart(6)}                        ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  📦 Total:            ${String(projectsCount + boqCount + kpiCount).padStart(7)}                        ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  console.log('\n🎉 Import completed successfully!');
  console.log('✅ New data is now in Supabase Public Schema');
  console.log('\n💡 Refresh your application: http://localhost:3000');
}

main().catch(console.error);

